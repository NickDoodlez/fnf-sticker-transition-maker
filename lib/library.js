const fs = require('fs');
const path = require('path');

const fsp = fs.promises;
const IMAGE_EXT = new Set(['.png', '.webp', '.jpg', '.jpeg']);
const AUDIO_EXT = new Set(['.ogg', '.wav', '.mp3', '.flac']);
const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

async function walk(dir, depth) {
  let out = [];
  let entries;
  try {
    entries = await fsp.readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (depth > 0) out = out.concat(await walk(full, depth - 1));
    } else {
      out.push(full);
    }
  }
  return out;
}

function depthOf(file) {
  return file.split(path.sep).length;
}

function resolveSubpack(fragments, fragmentNames, images) {
  const pool = [];
  let common = null;
  for (const fragmentName of fragmentNames) {
    const raw = Array.isArray(fragments[fragmentName]) ? fragments[fragmentName] : [];
    const names = raw.filter((n) => typeof n === 'string').map((n) => n.toLowerCase());
    if (!names.length) continue;
    for (const name of names) if (images[name]) pool.push(name);
    const previous = common;
    common = previous === null ? new Set(names) : new Set(names.filter((n) => previous.has(n)));
  }
  let last = common ? [...common].filter((n) => images[n]) : [];
  if (!last.length) last = [...new Set(pool)];
  return { pool, last };
}

function createLibrary(baseDir) {
  const packsDir = path.join(baseDir, 'stickerpacks');
  const soundsDir = path.join(baseDir, 'sounds');
  const allowed = new Set();

  async function scanPack(folder, id, depth) {
    const files = (await walk(folder, depth)).sort((a, b) => depthOf(a) - depthOf(b) || collator.compare(a, b));
    const images = {};
    for (const file of files) {
      const ext = path.extname(file).toLowerCase();
      if (!IMAGE_EXT.has(ext)) continue;
      const key = path.basename(file, path.extname(file)).toLowerCase();
      if (!images[key]) {
        images[key] = file;
        allowed.add(file);
      }
    }

    let meta = null;
    for (const file of files.filter((f) => path.extname(f).toLowerCase() === '.json')) {
      try {
        const json = JSON.parse(await fsp.readFile(file, 'utf8'));
        if (json && json.stickers && typeof json.stickers === 'object') {
          meta = json;
          break;
        }
      } catch {}
    }

    const subpacks = {};
    if (meta) {
      const fragments = meta.stickers;
      const map = meta.stickerPacks && typeof meta.stickerPacks === 'object' ? meta.stickerPacks : null;
      const definitions = map
        ? Object.entries(map).map(([key, list]) => [key, Array.isArray(list) ? list : []])
        : [['all', Object.keys(fragments)]];
      for (const [key, list] of definitions) {
        const sub = resolveSubpack(fragments, list, images);
        if (sub.pool.length) subpacks[key] = sub;
      }
    }
    if (!Object.keys(subpacks).length) {
      const names = Object.keys(images);
      if (names.length) subpacks.all = { pool: names, last: names };
    }

    return {
      id,
      name: meta && typeof meta.name === 'string' && meta.name ? meta.name : id,
      artist: meta && typeof meta.artist === 'string' ? meta.artist : '',
      imageCount: Object.keys(images).length,
      images,
      subpacks
    };
  }

  async function scanSounds() {
    const files = (await walk(soundsDir, 5))
      .filter((f) => AUDIO_EXT.has(path.extname(f).toLowerCase()))
      .sort((a, b) => collator.compare(a, b));
    const groups = new Map();
    for (const file of files) {
      const parent = path.dirname(file);
      const name = parent === soundsDir ? 'general' : path.basename(parent);
      if (!groups.has(name)) groups.set(name, []);
      groups.get(name).push(file);
      allowed.add(file);
    }
    return [...groups.entries()].map(([name, list]) => ({ name, files: list }));
  }

  async function scan() {
    await fsp.mkdir(packsDir, { recursive: true });
    await fsp.mkdir(soundsDir, { recursive: true });
    allowed.clear();
    const dirents = (await fsp.readdir(packsDir, { withFileTypes: true }))
      .filter((d) => d.isDirectory())
      .sort((a, b) => collator.compare(a.name, b.name));
    const packs = [];
    const loose = await scanPack(packsDir, 'stickerpacks', 0);
    if (loose.imageCount) packs.push(loose);
    for (const dirent of dirents) packs.push(await scanPack(path.join(packsDir, dirent.name), dirent.name, 4));
    const sounds = await scanSounds();
    return { packs, sounds, baseDir, packsDir, soundsDir };
  }

  return {
    packsDir,
    soundsDir,
    scan,
    isAllowed: (file) => allowed.has(file)
  };
}

module.exports = { createLibrary };
