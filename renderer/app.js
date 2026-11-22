(function () {
  'use strict';

  const i18n = window.FNF.i18n;
  const t = i18n.t;
  const api = window.api;
  if (!api) {
    i18n.setLang(i18n.detect());
    i18n.apply();
    const box = document.getElementById('stageMsg');
    box.hidden = false;
    box.textContent = t('msg.onlyPage');
    for (const el of document.querySelectorAll('button, select, input')) el.disabled = true;
    return;
  }
  const { buildScene, drawFrame, randomSeed } = window.FNF.engine;
  const audio = window.FNF.audio;
  const $ = (id) => document.getElementById(id);

  const STORAGE_KEY = 'fnf-sticker-transition-maker.v1';
  const RES_PRESETS = {
    '1280x720': [1280, 720],
    '1920x1080': [1920, 1080],
    '2560x1440': [2560, 1440],
    '3840x2160': [3840, 2160],
    '1080x1920': [1080, 1920],
    '1080x1080': [1080, 1080]
  };
  const RANDOM_DEFAULTS = {
    rowMin: 70,
    rowMax: 120,
    angleMin: -60,
    angleMax: 70,
    scaleMin: 0.97,
    scaleMax: 1.02,
    stickerScale: 1,
    spacing: 0.5,
    lastMode: 'common'
  };
  const DEFAULTS = Object.assign(
    {
      pack: '',
      subpack: '',
      mode: 'full',
      cover: 0.9,
      hold: 0.5,
      seed: '',
      soundOn: true,
      volume: 0.7,
      soundGroup: 'random',
      bgType: 'transparent',
      bgColor: '#000000',
      resPreset: '1920x1080',
      width: 1920,
      height: 1080,
      fps: 60,
      format: 'webm',
      expAudio: true,
      loop: true,
      lang: i18n.detect()
    },
    RANDOM_DEFAULTS
  );
  const REBUILD_KEYS = new Set([
    'mode', 'cover', 'hold', 'seed', 'lastMode', 'rowMin', 'rowMax', 'angleMin', 'angleMax', 'scaleMin', 'scaleMax',
    'stickerScale', 'spacing', 'soundOn', 'soundGroup', 'width', 'height', 'resPreset'
  ]);
  const PAIRS = [['rowMin', 'rowMax'], ['angleMin', 'angleMax'], ['scaleMin', 'scaleMax']];

  const settings = Object.assign({}, DEFAULTS, readStored());
  i18n.setLang(settings.lang);
  settings.lang = i18n.lang;
  const state = {
    data: { packs: [], sounds: [] },
    pool: [],
    last: [],
    soundGroups: [],
    bitmaps: new Map(),
    scene: null,
    t: 0,
    playing: false,
    startWall: 0,
    startT: 0,
    lastT: 0,
    raf: 0,
    loadToken: 0,
    bgBitmap: null,
    bgName: '',
    bgFailed: false,
    stage: null,
    ready: false,
    exporting: false,
    cancel: false,
    result: ''
  };

  const canvas = $('view');
  const viewCtx = canvas.getContext('2d');
  const stage = $('stage');
  let saveTimer = 0;
  let rebuildTimer = 0;

  function readStored() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      return raw && typeof raw === 'object' ? raw : {};
    } catch {
      return {};
    }
  }

  function saveSettings() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      } catch {}
    }, 250);
  }

  function formatOutput(key, value) {
    if (key === 'cover' || key === 'hold') return `${value.toFixed(2)} s`;
    if (key === 'volume') return `${Math.round(value * 100)} %`;
    if (key === 'stickerScale') return `${value.toFixed(2)}×`;
    return value.toFixed(2);
  }

  function showControls() {
    for (const key of Object.keys(DEFAULTS)) {
      const el = $(key);
      if (!el) continue;
      if (el.type === 'checkbox') el.checked = !!settings[key];
      else el.value = settings[key];
    }
    for (const out of document.querySelectorAll('output[data-for]')) {
      out.textContent = formatOutput(out.dataset.for, Number(settings[out.dataset.for]));
    }
    for (const button of $('modeSeg').children) {
      button.setAttribute('aria-checked', String(button.dataset.mode === settings.mode));
    }
  }

  function readControl(key) {
    const el = $(key);
    if (!el) return;
    if (el.type === 'checkbox') {
      settings[key] = el.checked;
      return;
    }
    if (el.type === 'number' || el.type === 'range') {
      let value = parseFloat(el.value);
      if (!Number.isFinite(value)) value = DEFAULTS[key];
      const min = el.min === '' ? -Infinity : Number(el.min);
      const max = el.max === '' ? Infinity : Number(el.max);
      value = Math.min(max, Math.max(min, value));
      if (key === 'width' || key === 'height') value = Math.round(value / 2) * 2;
      if (key === 'fps') value = Math.round(value);
      settings[key] = value;
      return;
    }
    settings[key] = el.value;
  }

  function normalizePairs() {
    for (const [a, b] of PAIRS) {
      if (settings[a] > settings[b]) {
        const tmp = settings[a];
        settings[a] = settings[b];
        settings[b] = tmp;
      }
    }
  }

  function selectedPack() {
    return state.data.packs.find((p) => p.id === settings.pack) || null;
  }

  function fillPackSelect() {
    const select = $('pack');
    select.textContent = '';
    const packs = state.data.packs;
    for (const pack of packs) {
      const option = document.createElement('option');
      option.value = pack.id;
      option.textContent = pack.name === pack.id ? pack.name : `${pack.name} (${pack.id})`;
      select.appendChild(option);
    }
    if (!packs.length) {
      const option = document.createElement('option');
      option.textContent = t('pack.none');
      option.value = '';
      select.appendChild(option);
    }
    if (packs.length && !packs.some((p) => p.id === settings.pack)) {
      const withStickers = packs.find((p) => Object.keys(p.subpacks).length) || packs[0];
      settings.pack = withStickers ? withStickers.id : '';
    }
    select.value = packs.length ? settings.pack : '';
    fillSubpackSelect();
  }

  function fillSubpackSelect() {
    const select = $('subpack');
    select.textContent = '';
    const pack = selectedPack();
    const keys = pack ? Object.keys(pack.subpacks) : [];
    for (const key of keys) {
      const option = document.createElement('option');
      option.value = key;
      option.textContent = key;
      select.appendChild(option);
    }
    if (!keys.length) {
      const option = document.createElement('option');
      option.value = '';
      option.textContent = t('pack.noSets');
      select.appendChild(option);
    }
    if (keys.length && !keys.includes(settings.subpack)) settings.subpack = keys.includes('all') ? 'all' : keys[0];
    select.value = keys.includes(settings.subpack) ? settings.subpack : '';
  }

  function fillSoundSelect() {
    const select = $('soundGroup');
    select.textContent = '';
    const random = document.createElement('option');
    random.value = 'random';
    random.textContent = t('sound.random');
    select.appendChild(random);
    for (const group of state.soundGroups) {
      const option = document.createElement('option');
      option.value = group.name;
      option.textContent = `${group.name} (${group.buffers.length})`;
      select.appendChild(option);
    }
    const valid = settings.soundGroup === 'random' || state.soundGroups.some((g) => g.name === settings.soundGroup);
    if (!valid && state.soundGroups.length) settings.soundGroup = 'random';
    select.value = valid ? settings.soundGroup : 'random';
  }

  function bytesToBuffer(bytes) {
    return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  }

  async function loadBitmap(file) {
    if (state.bitmaps.has(file)) return state.bitmaps.get(file);
    const bytes = await api.readFile(file);
    const bitmap = await createImageBitmap(new Blob([bytes]));
    state.bitmaps.set(file, bitmap);
    return bitmap;
  }

  async function loadPack() {
    const token = ++state.loadToken;
    const pack = selectedPack();
    const sub = pack && pack.subpacks[settings.subpack];
    state.pool = [];
    state.last = [];
    if (!sub) {
      updatePackInfo();
      rebuildScene();
      return;
    }
    setStageMessage('msg.loadingStickers');
    const names = [...new Set([...sub.pool, ...sub.last])];
    const images = new Map();
    await Promise.all(
      names.map(async (name) => {
        try {
          const bitmap = await loadBitmap(pack.images[name]);
          images.set(name, { name, bitmap, width: bitmap.width, height: bitmap.height });
        } catch {}
      })
    );
    if (token !== state.loadToken) return;
    state.pool = sub.pool.map((n) => images.get(n)).filter(Boolean);
    state.last = sub.last.map((n) => images.get(n)).filter(Boolean);
    updatePackInfo();
    rebuildScene();
  }

  async function loadSounds() {
    const groups = [];
    for (const group of state.data.sounds) {
      const buffers = [];
      for (const file of group.files) {
        try {
          buffers.push(await audio.decode(bytesToBuffer(await api.readFile(file))));
        } catch {}
      }
      if (buffers.length) groups.push({ name: group.name, buffers });
    }
    state.soundGroups = groups;
    fillSoundSelect();
  }

  function updatePackInfo() {
    const pack = selectedPack();
    const info = $('packInfo');
    if (!state.ready) {
      info.textContent = '';
      return;
    }
    if (!pack) {
      info.textContent = t('info.noPacks');
      return;
    }
    const unique = new Set(state.pool.map((s) => s.name)).size;
    const author = pack.artist ? t('info.artist', { artist: pack.artist }) : '';
    info.textContent = unique
      ? author + t('info.loaded', { n: unique, total: pack.imageCount })
      : author + t('info.missing');
  }

  function setStageMessage(key, params) {
    state.stage = key ? { key, params } : null;
    renderStageMessage();
  }

  function renderStageMessage() {
    const el = $('stageMsg');
    el.hidden = !state.stage;
    el.textContent = state.stage ? t(state.stage.key, state.stage.params) : '';
  }

  function sceneParams() {
    return {
      seed: settings.seed,
      aspect: settings.width / settings.height,
      pool: state.pool,
      last: settings.lastMode === 'any' ? state.pool : state.last,
      mode: settings.mode,
      cover: settings.cover,
      hold: settings.hold,
      rowMin: settings.rowMin,
      rowMax: settings.rowMax,
      angleMin: settings.angleMin,
      angleMax: settings.angleMax,
      scaleMin: settings.scaleMin,
      scaleMax: settings.scaleMax,
      stickerScale: settings.stickerScale,
      spacing: settings.spacing,
      soundGroups: settings.soundOn ? state.soundGroups : [],
      soundGroup: settings.soundGroup
    };
  }

  function rebuildScene() {
    if (!state.pool.length) {
      state.scene = null;
      state.playing = false;
      syncPlayButton();
      setStageMessage(state.data.packs.length ? 'msg.unusablePack' : 'msg.putPack');
      updateTimeline();
      updateInfo();
      requestDraw();
      return;
    }
    setStageMessage('');
    state.scene = buildScene(sceneParams());
    state.t = Math.min(state.t, state.scene.duration);
    updateTimeline();
    updateInfo();
    requestDraw();
  }

  function scheduleRebuild() {
    clearTimeout(rebuildTimer);
    rebuildTimer = setTimeout(rebuildScene, 30);
  }

  function exportBackground() {
    if (settings.format === 'mp4' && settings.bgType === 'transparent') return { type: 'color', color: '#000000' };
    return previewBackground();
  }

  function previewBackground() {
    if (settings.bgType === 'color') return { type: 'color', color: settings.bgColor };
    if (settings.bgType === 'image' && state.bgBitmap) return { type: 'image', image: state.bgBitmap };
    return { type: 'transparent' };
  }

  function frameCount(scene) {
    return Math.max(1, Math.ceil(scene.duration * settings.fps - 1e-9));
  }

  function updateInfo() {
    const scene = state.scene;
    const alpha = settings.bgType === 'transparent' && settings.format !== 'mp4';
    const parts = [];
    if (scene) {
      parts.push(
        t('info.summary', {
          mode: t(`mode.${settings.mode}`),
          d: scene.duration.toFixed(2),
          f: frameCount(scene),
          n: scene.count
        })
      );
    }
    parts.push(t('info.resolution', { w: settings.width, h: settings.height, fps: settings.fps }));
    if (settings.format === 'mp4' && settings.bgType === 'transparent') {
      parts.push(t('info.mp4Black'));
    } else if (alpha) {
      parts.push(t('info.alpha'));
    }
    $('expInfo').textContent = parts.join(' ');
    $('expAudioLabel').textContent = t(settings.format === 'png' ? 'audio.includePng' : 'audio.include');
    $('btnExport').disabled = !scene || state.exporting;
    $('bgColor').disabled = settings.bgType !== 'color';
    $('btnBgImage').disabled = settings.bgType !== 'image';
    $('bgName').textContent = settings.bgType === 'image' ? (state.bgFailed ? t('bg.unreadable') : state.bgName) : '';
  }

  function updateTimeline() {
    const duration = state.scene ? state.scene.duration : 0;
    const slider = $('timeline');
    slider.max = String(Math.max(1, Math.round(duration * 1000)));
    slider.value = String(Math.round(state.t * 1000));
    slider.disabled = !state.scene;
    $('timeLabel').textContent = `${state.t.toFixed(2)} / ${duration.toFixed(2)} s`;
    $('btnPlay').disabled = !state.scene;
    $('btnRestart').disabled = !state.scene;
    $('btnNew').disabled = !state.pool.length;
  }

  function syncPlayButton() {
    $('playIcon').setAttribute('d', state.playing ? 'M6 4h4v16H6zM14 4h4v16h-4z' : 'M7 4l13 8-13 8z');
    $('playLabel').textContent = t(state.playing ? 'pause' : 'play');
  }

  function layoutStage() {
    const box = stage.getBoundingClientRect();
    const padding = 26;
    const availW = Math.max(40, box.width - padding * 2);
    const availH = Math.max(40, box.height - padding * 2);
    const aspect = settings.width / settings.height;
    let w = availW;
    let h = w / aspect;
    if (h > availH) {
      h = availH;
      w = h * aspect;
    }
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.style.width = `${Math.floor(w)}px`;
    canvas.style.height = `${Math.floor(h)}px`;
    canvas.width = Math.max(2, Math.round(w * dpr));
    canvas.height = Math.max(2, Math.round(h * dpr));
    requestDraw();
  }

  function requestDraw() {
    if (!state.raf) state.raf = requestAnimationFrame(frame);
  }

  function fireSounds(from, to) {
    if (!settings.soundOn || !state.scene) return;
    for (const event of state.scene.events) {
      if (event.t > from && event.t <= to) audio.play(event.buffer, settings.volume);
    }
  }

  function frame(now) {
    state.raf = 0;
    const scene = state.scene;
    if (state.playing && scene) {
      const duration = scene.duration;
      let t = state.startT + (now - state.startWall) / 1000;
      if (t >= duration) {
        fireSounds(state.lastT, duration + 1);
        if (settings.loop) {
          state.startWall = now;
          state.startT = 0;
          state.lastT = -1e-6;
          t = 0;
        } else {
          t = duration;
          state.playing = false;
          syncPlayButton();
        }
      } else {
        fireSounds(state.lastT, t);
        state.lastT = t;
      }
      state.t = t;
      updateTimeline();
    }
    drawFrame(viewCtx, scene, state.t, canvas.width, canvas.height, previewBackground());
    if (state.playing) requestDraw();
  }

  async function play() {
    if (!state.scene) return;
    await audio.resume();
    if (state.t >= state.scene.duration - 1e-3) state.t = 0;
    state.playing = true;
    state.startWall = performance.now();
    state.startT = state.t;
    state.lastT = state.t - 1e-6;
    syncPlayButton();
    requestDraw();
  }

  function pause() {
    state.playing = false;
    syncPlayButton();
    requestDraw();
  }

  function seek(t) {
    state.t = t;
    state.lastT = t;
    if (state.playing) {
      state.startT = t;
      state.startWall = performance.now();
    }
    updateTimeline();
    requestDraw();
  }

  function newSeed(autoplay) {
    settings.seed = randomSeed();
    $('seed').value = settings.seed;
    saveSettings();
    rebuildScene();
    if (autoplay) {
      state.t = 0;
      play();
    }
  }

  function onControl(key) {
    readControl(key);
    normalizePairs();
    if (key === 'seed' && !settings.seed.trim()) settings.seed = randomSeed();

    if (key === 'resPreset' && RES_PRESETS[settings.resPreset]) {
      [settings.width, settings.height] = RES_PRESETS[settings.resPreset];
    } else if (key === 'width' || key === 'height') {
      const match = Object.keys(RES_PRESETS).find((k) => RES_PRESETS[k][0] === settings.width && RES_PRESETS[k][1] === settings.height);
      settings.resPreset = match || 'custom';
    }

    if (key === 'bgType' && settings.bgType === 'image' && !state.bgBitmap) {
      pickBackground();
    }

    showControls();
    if (key === 'pack') {
      fillSubpackSelect();
      loadPack();
    } else if (key === 'subpack') {
      loadPack();
    } else if (REBUILD_KEYS.has(key)) {
      if (key === 'resPreset' || key === 'width' || key === 'height') layoutStage();
      scheduleRebuild();
    } else {
      updateInfo();
      requestDraw();
    }
    saveSettings();
  }

  async function pickBackground() {
    const picked = await api.pickImage({ title: t('dlg.pickImage'), filterName: t('dlg.images') });
    if (!picked) {
      if (!state.bgBitmap) {
        settings.bgType = 'transparent';
        showControls();
        updateInfo();
        requestDraw();
      }
      return;
    }
    try {
      state.bgBitmap = await createImageBitmap(new Blob([picked.data]));
      state.bgName = picked.name;
      state.bgFailed = false;
    } catch {
      state.bgBitmap = null;
      state.bgName = '';
      state.bgFailed = true;
    }
    updateInfo();
    requestDraw();
  }

  function safeName(text) {
    return text.replace(/[^\w.-]+/g, '_').slice(0, 40) || 'seed';
  }

  function showOverlay(title, text, action) {
    $('overlay').hidden = false;
    $('ovTitle').textContent = title;
    $('ovText').textContent = text;
    $('btnOvAction').textContent = action;
  }

  function setProgress(done, total) {
    $('ovBar').style.width = `${Math.round((done / total) * 100)}%`;
    $('ovText').textContent = t('ov.frame', { a: done, b: total });
  }

  function describeError(error) {
    const raw = String(error && error.message ? error.message : error).replace(/^Error invoking remote method '[^']+': (Error: )?/, '');
    const match = raw.match(/^(E_[A-Z_]+)\b\s*([\s\S]*)$/);
    if (!match) return raw;
    const known = t(`err.${match[1]}`);
    if (known === `err.${match[1]}`) return raw;
    return match[2] ? `${known}\n${match[2]}` : known;
  }

  async function runExport() {
    if (state.exporting || !state.scene) return;
    pause();
    const scene = state.scene;
    const format = settings.format;
    const { width, height, fps } = settings;

    if (format === 'mp4' && (width % 2 || height % 2)) {
      showOverlay(t('ov.cannot'), t('err.E_MP4_EVEN'), t('close'));
      state.exporting = false;
      return;
    }

    const stamp = new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '');
    const name = `sticker-transition_${safeName(settings.seed)}_${width}x${height}_${fps}fps_${stamp}`;
    const target = await api.exportChoose({ format, name, title: t(format === 'png' ? 'dlg.pngFolder' : 'dlg.save') });
    if (!target) return;

    state.exporting = true;
    state.cancel = false;
    state.result = '';
    $('btnReveal').hidden = true;
    $('ovBar').style.width = '0%';
    showOverlay(t('ov.exporting'), t('ov.preparing'), t('ov.cancel'));

    const frames = frameCount(scene);
    const background = exportBackground();
    const alpha = background.type === 'transparent';
    let started = false;

    try {
      let wav = null;
      if (settings.expAudio && settings.soundOn && scene.events.length) {
        $('ovText').textContent = t('ov.mixing');
        wav = await audio.renderMix(scene.events, frames / fps, settings.volume);
      }
      await api.exportStart({ format, target, width, height, fps, alpha, audio: wav });
      started = true;

      const surface = document.createElement('canvas');
      surface.width = width;
      surface.height = height;
      const ctx = surface.getContext('2d', { willReadFrequently: format !== 'png' });
      let pending = null;

      for (let i = 0; i < frames; i++) {
        if (state.cancel) break;
        drawFrame(ctx, scene, i / fps, width, height, background);
        let payload;
        if (format === 'png') {
          const blob = await new Promise((resolve) => surface.toBlob(resolve, 'image/png'));
          payload = await blob.arrayBuffer();
        } else {
          payload = ctx.getImageData(0, 0, width, height).data.buffer;
        }
        if (pending) await pending;
        pending = api.exportFrame(payload);
        pending.catch(() => {});
        if (i % 2 === 0 || i === frames - 1) setProgress(i + 1, frames);
      }
      if (pending) await pending;

      if (state.cancel) {
        await api.exportCancel();
        started = false;
        $('overlay').hidden = true;
      } else {
        $('ovText').textContent = t('ov.finishing');
        const output = await api.exportFinish();
        started = false;
        state.result = output;
        $('ovBar').style.width = '100%';
        showOverlay(t('ov.done'), output, t('close'));
        $('btnReveal').hidden = false;
      }
    } catch (error) {
      if (started) await api.exportCancel().catch(() => {});
      showOverlay(t('ov.failed'), describeError(error), t('close'));
    } finally {
      state.exporting = false;
      updateInfo();
    }
  }

  function applyLanguage() {
    i18n.setLang(settings.lang);
    i18n.apply();
    for (const button of $('langSeg').children) {
      button.setAttribute('aria-pressed', String(button.dataset.lang === i18n.lang));
    }
    fillPackSelect();
    fillSoundSelect();
    updatePackInfo();
    syncPlayButton();
    updateInfo();
    renderStageMessage();
    if (!$('overlay').hidden && !state.exporting) $('btnOvAction').textContent = t('close');
  }

  async function reload() {
    state.data = await api.scan();
    state.ready = true;
    state.bitmaps.clear();
    fillPackSelect();
    await loadPack();
  }

  function bindControls() {
    for (const key of Object.keys(DEFAULTS)) {
      const el = $(key);
      if (!el) continue;
      const live = el.type === 'range' || el.type === 'checkbox' || el.tagName === 'SELECT' || el.type === 'color';
      el.addEventListener(live ? 'input' : 'change', () => onControl(key));
    }

    for (const button of $('modeSeg').children) {
      button.addEventListener('click', () => {
        settings.mode = button.dataset.mode;
        showControls();
        scheduleRebuild();
        saveSettings();
      });
    }

    for (const chip of document.querySelectorAll('[data-fps]')) {
      chip.addEventListener('click', () => {
        $('fps').value = chip.dataset.fps;
        onControl('fps');
      });
    }

    for (const button of $('langSeg').children) {
      button.addEventListener('click', () => {
        settings.lang = button.dataset.lang;
        applyLanguage();
        saveSettings();
      });
    }

    $('btnPlay').addEventListener('click', () => (state.playing ? pause() : play()));
    $('btnRestart').addEventListener('click', () => {
      seek(0);
      if (!state.playing) play();
    });
    $('timeline').addEventListener('input', (e) => seek(Number(e.target.value) / 1000));
    $('btnNew').addEventListener('click', () => newSeed(true));
    $('btnDice').addEventListener('click', () => newSeed(false));
    $('btnCopy').addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(settings.seed);
        $('btnCopy').textContent = t('seed.copied');
        setTimeout(() => ($('btnCopy').textContent = t('seed.copy')), 1200);
      } catch {}
    });
    $('btnResetRandom').addEventListener('click', () => {
      Object.assign(settings, RANDOM_DEFAULTS);
      showControls();
      scheduleRebuild();
      saveSettings();
    });
    $('btnOpenPacks').addEventListener('click', () => api.openFolder('packs'));
    $('btnOpenSounds').addEventListener('click', () => api.openFolder('sounds'));
    $('btnReload').addEventListener('click', async () => {
      await reload();
      await loadSounds();
      rebuildScene();
    });
    $('btnBgImage').addEventListener('click', pickBackground);
    $('btnExport').addEventListener('click', runExport);
    $('btnOvAction').addEventListener('click', () => {
      if (state.exporting) {
        state.cancel = true;
        $('ovText').textContent = t('ov.canceling');
      } else {
        $('overlay').hidden = true;
      }
    });
    $('btnReveal').addEventListener('click', () => api.reveal(state.result));
    $('btnCredits').addEventListener('click', () => {
      const pack = selectedPack();
      $('creditArt').textContent = pack && pack.artist ? t('credits.art', { name: pack.name, artist: pack.artist }) : '';
      $('credits').showModal();
    });

    document.addEventListener('keydown', (e) => {
      if (e.code !== 'Space') return;
      const tag = document.activeElement && document.activeElement.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'BUTTON' || tag === 'TEXTAREA') return;
      e.preventDefault();
      if (!$('overlay').hidden || $('credits').open) return;
      if (state.playing) pause();
      else play();
    });

    new ResizeObserver(layoutStage).observe(stage);
  }

  async function init() {
    if (!settings.seed) settings.seed = randomSeed();
    showControls();
    bindControls();
    applyLanguage();
    layoutStage();
    updateTimeline();
    setStageMessage('msg.loading');
    try {
      await reload();
      await loadSounds();
      rebuildScene();
    } catch (error) {
      setStageMessage('msg.folderError', { error: error && error.message ? error.message : error });
    }
    showControls();
  }

  init();
})();
