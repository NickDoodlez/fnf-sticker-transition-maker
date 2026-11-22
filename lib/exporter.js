const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const fsp = fs.promises;
const FORMATS = ['mp4', 'webm', 'mov', 'png'];

function buildArgs(o, audioFile) {
  const args = [
    '-y', '-hide_banner', '-loglevel', 'error',
    '-f', 'rawvideo', '-pixel_format', 'rgba',
    '-video_size', `${o.width}x${o.height}`,
    '-framerate', String(o.fps),
    '-i', 'pipe:0'
  ];
  if (audioFile) args.push('-i', audioFile);

  if (o.format === 'mp4') {
    args.push('-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-pix_fmt', 'yuv420p', '-movflags', '+faststart');
  } else if (o.format === 'webm') {
    args.push('-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '24', '-row-mt', '1', '-deadline', 'good', '-cpu-used', '2');
    if (o.alpha) args.push('-pix_fmt', 'yuva420p', '-auto-alt-ref', '0');
    else args.push('-pix_fmt', 'yuv420p');
  } else {
    args.push('-c:v', 'prores_ks', '-vendor', 'apl0');
    if (o.alpha) args.push('-profile:v', '4444', '-pix_fmt', 'yuva444p10le');
    else args.push('-profile:v', '3', '-pix_fmt', 'yuv422p10le');
  }

  if (audioFile) {
    const codec = o.format === 'mp4' ? ['-c:a', 'aac', '-b:a', '192k'] : o.format === 'webm' ? ['-c:a', 'libopus', '-b:a', '160k'] : ['-c:a', 'pcm_s16le'];
    args.push(...codec);
  } else {
    args.push('-an');
  }
  args.push(o.target);
  return args;
}

function toBuffer(data) {
  if (ArrayBuffer.isView(data)) return Buffer.from(data.buffer, data.byteOffset, data.byteLength);
  return Buffer.from(data);
}

function writeFrame(job, data) {
  return new Promise((resolve, reject) => {
    if (job.exited) {
      job.done.then(() => reject(new Error('E_FFMPEG_ENDED')), reject);
      return;
    }
    const stdin = job.proc.stdin;
    const cleanup = () => {
      stdin.off('drain', onDrain);
      stdin.off('error', onFail);
      stdin.off('close', onFail);
    };
    const onDrain = () => {
      cleanup();
      resolve();
    };
    const onFail = () => {
      cleanup();
      job.done.then(() => reject(new Error('E_FFMPEG_INPUT')), reject);
    };
    stdin.once('error', onFail);
    stdin.once('close', onFail);
    if (stdin.write(data)) onDrain();
    else stdin.once('drain', onDrain);
  });
}

function createExporter(getFfmpegPath) {
  let job = null;

  async function disposeTemp(j) {
    if (j && j.tmp) await fsp.rm(j.tmp, { force: true }).catch(() => {});
  }

  async function start(o) {
    if (job) throw new Error('E_BUSY');
    if (!FORMATS.includes(o.format)) throw new Error('E_FORMAT');
    const width = Math.round(o.width);
    const height = Math.round(o.height);
    const fps = Number(o.fps);
    if (!(width > 0 && height > 0 && fps > 0)) throw new Error('E_SIZE');
    const audio = o.audio ? toBuffer(o.audio) : null;

    if (o.format === 'png') {
      await fsp.mkdir(o.target, { recursive: true });
      if (audio) await fsp.writeFile(path.join(o.target, 'audio.wav'), audio);
      job = { kind: 'png', target: o.target, index: 0, tmp: null };
      return true;
    }

    const bin = getFfmpegPath();
    if (!bin || !fs.existsSync(bin)) throw new Error('E_NO_FFMPEG');
    if (o.format === 'mp4' && (width % 2 || height % 2)) throw new Error('E_MP4_EVEN');

    let tmp = null;
    if (audio) {
      tmp = path.join(os.tmpdir(), `fnf-stm-${process.pid}-${Date.now()}.wav`);
      await fsp.writeFile(tmp, audio);
    }

    const proc = spawn(bin, buildArgs({ ...o, width, height, fps }, tmp), {
      stdio: ['pipe', 'ignore', 'pipe'],
      windowsHide: true
    });
    let log = '';
    proc.stderr.on('data', (d) => {
      log = (log + d.toString()).slice(-3000);
    });
    const j = { kind: 'video', proc, target: o.target, tmp, exited: false };
    j.done = new Promise((resolve, reject) => {
      proc.on('error', (e) => {
        j.exited = true;
        reject(e);
      });
      proc.on('close', (code) => {
        j.exited = true;
        if (code === 0) resolve();
        else reject(new Error(`E_FFMPEG_EXIT ${code}\n${log}`));
      });
    });
    j.done.catch(() => {});
    proc.stdin.on('error', () => {});
    job = j;
    return true;
  }

  async function frame(buffer) {
    const j = job;
    if (!j) throw new Error('E_NO_JOB');
    const data = toBuffer(buffer);
    if (j.kind === 'png') {
      j.index += 1;
      await fsp.writeFile(path.join(j.target, `frame_${String(j.index).padStart(5, '0')}.png`), data);
      return;
    }
    await writeFrame(j, data);
  }

  async function finish() {
    const j = job;
    if (!j) throw new Error('E_NO_JOB');
    try {
      if (j.kind === 'video') {
        j.proc.stdin.end();
        await j.done;
      }
      return j.target;
    } finally {
      job = null;
      await disposeTemp(j);
    }
  }

  async function cancel() {
    const j = job;
    if (!j) return;
    job = null;
    if (j.kind === 'video') {
      try {
        j.proc.stdin.destroy();
        j.proc.kill();
      } catch {}
      await j.done.catch(() => {});
      await fsp.rm(j.target, { force: true }).catch(() => {});
    }
    await disposeTemp(j);
  }

  return { start, frame, finish, cancel, isActive: () => job !== null };
}

module.exports = { createExporter, buildArgs };
