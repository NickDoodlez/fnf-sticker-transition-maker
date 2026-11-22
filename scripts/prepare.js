const fs = require('fs');
const os = require('os');
const path = require('path');
const https = require('https');
const zlib = require('zlib');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const electronDir = path.join(root, 'node_modules', 'electron');
const electronDist = path.join(electronDir, 'dist');
const ffmpegDir = path.join(root, 'node_modules', 'ffmpeg-static');
const exeName = process.platform === 'win32' ? 'electron.exe' : process.platform === 'darwin' ? 'Electron.app/Contents/MacOS/Electron' : 'electron';

function cleanEnv() {
  const env = { ...process.env };
  for (const key of Object.keys(env)) {
    if (/skip_binary_download/i.test(key)) delete env[key];
  }
  delete env.ELECTRON_OVERRIDE_DIST_PATH;
  return env;
}

function download(url, destination, redirects = 0) {
  return new Promise((resolve, reject) => {
    if (redirects > 10) return reject(new Error('Demasiadas redirecciones'));
    https
      .get(url, { headers: { 'User-Agent': 'fnf-sticker-transition-maker' } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume();
          return resolve(download(new URL(res.headers.location, url).toString(), destination, redirects + 1));
        }
        if (res.statusCode !== 200) {
          res.resume();
          return reject(new Error(`HTTP ${res.statusCode} al descargar ${url}`));
        }
        const total = Number(res.headers['content-length']) || 0;
        let received = 0;
        let lastPercent = -1;
        const file = fs.createWriteStream(destination);
        res.on('data', (chunk) => {
          received += chunk.length;
          if (total) {
            const percent = Math.floor((received / total) * 10) * 10;
            if (percent !== lastPercent) {
              lastPercent = percent;
              process.stdout.write(`\r  ${percent}%`);
            }
          }
        });
        res.pipe(file);
        file.on('finish', () => file.close(() => {
          process.stdout.write('\n');
          resolve();
        }));
        file.on('error', reject);
        res.on('error', reject);
      })
      .on('error', reject);
  });
}

function extractZip(zipFile, destination) {
  fs.mkdirSync(destination, { recursive: true });
  if (process.platform === 'win32') {
    const script = `Expand-Archive -LiteralPath '${zipFile.replace(/'/g, "''")}' -DestinationPath '${destination.replace(/'/g, "''")}' -Force`;
    const result = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', script], { stdio: 'inherit' });
    if (result.status === 0) return;
    const tar = spawnSync('tar', ['-xf', zipFile, '-C', destination], { stdio: 'inherit' });
    if (tar.status === 0) return;
    throw new Error('No se pudo descomprimir el archivo de Electron.');
  }
  const result = spawnSync('unzip', ['-q', '-o', zipFile, '-d', destination], { stdio: 'inherit' });
  if (result.status !== 0) throw new Error('No se pudo descomprimir el archivo de Electron.');
}

async function installElectron() {
  const { version } = JSON.parse(fs.readFileSync(path.join(electronDir, 'package.json'), 'utf8'));
  const platform = process.env.npm_config_platform || process.platform;
  const arch = process.env.npm_config_arch || process.arch;
  const mirror = process.env.ELECTRON_MIRROR || 'https://github.com/electron/electron/releases/download/';
  const url = `${mirror}v${version}/electron-v${version}-${platform}-${arch}.zip`;
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'electron-'));
  const zipFile = path.join(tmp, 'electron.zip');
  try {
    console.log(`Descargando Electron ${version} (${platform}-${arch})...`);
    await download(url, zipFile);
    fs.rmSync(electronDist, { recursive: true, force: true });
    console.log('Extrayendo Electron...');
    extractZip(zipFile, electronDist);
    fs.writeFileSync(path.join(electronDir, 'path.txt'), exeName);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

async function installFfmpeg() {
  const pkg = JSON.parse(fs.readFileSync(path.join(ffmpegDir, 'package.json'), 'utf8'));
  const tag = (pkg['ffmpeg-static'] && pkg['ffmpeg-static']['binary-release-tag']) || 'b6.1.1';
  const platform = process.platform;
  const arch = process.arch;
  const target = path.join(ffmpegDir, platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg');
  const url = `https://github.com/eugeneware/ffmpeg-static/releases/download/${tag}/ffmpeg-${platform}-${arch}.gz`;
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ffmpeg-'));
  const gzFile = path.join(tmp, 'ffmpeg.gz');
  try {
    console.log('Descargando ffmpeg...');
    await download(url, gzFile);
    fs.writeFileSync(target, zlib.gunzipSync(fs.readFileSync(gzFile)));
    if (process.platform !== 'win32') fs.chmodSync(target, 0o755);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

function runInstall(dir, label) {
  console.log(`Ejecutando instalador de ${label}...`);
  spawnSync(process.execPath, ['install.js'], { cwd: dir, stdio: 'inherit', env: cleanEnv() });
}

async function ensure() {
  if (!fs.existsSync(electronDir)) throw new Error('Falta node_modules. Ejecuta "npm install" primero.');

  const electronExe = path.join(electronDist, exeName);
  if (!fs.existsSync(electronExe)) runInstall(electronDir, 'Electron');
  if (!fs.existsSync(electronExe)) {
    try {
      await installElectron();
    } catch (error) {
      throw new Error(`No se pudo instalar Electron: ${error.message}\nRevisa tu conexión a internet, antivirus o proxy y vuelve a intentarlo.`);
    }
  }
  if (!fs.existsSync(electronExe)) throw new Error('Electron no quedó instalado correctamente.');

  if (!fs.existsSync(ffmpegDir)) throw new Error('Falta ffmpeg-static. Ejecuta "npm install" primero.');
  const ffmpeg = require('ffmpeg-static');
  if (!ffmpeg) throw new Error('ffmpeg-static no tiene binario para este sistema.');
  if (!fs.existsSync(ffmpeg)) runInstall(ffmpegDir, 'ffmpeg');
  if (!fs.existsSync(ffmpeg)) {
    try {
      await installFfmpeg();
    } catch (error) {
      throw new Error(`No se pudo instalar ffmpeg: ${error.message}`);
    }
  }
  if (!fs.existsSync(ffmpeg)) throw new Error('ffmpeg no quedó instalado correctamente.');
  return { electronDist, electronExe, ffmpeg };
}

module.exports = { ensure };

if (require.main === module) {
  ensure()
    .then(() => console.log('Dependencias listas.'))
    .catch((error) => {
      console.error(error.message);
      process.exit(1);
    });
}
