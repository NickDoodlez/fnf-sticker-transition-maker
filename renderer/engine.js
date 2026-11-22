(function () {
  'use strict';

  const LOGICAL_HEIGHT = 720;
  const START_OFFSET = -100;
  const POP_FRAME = 1 / 24;
  const TAIL = 0.3;
  const MAX_STICKERS = 3000;
  const RAD = Math.PI / 180;

  function xmur3(str) {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    return function () {
      h = Math.imul(h ^ (h >>> 16), 2246822507);
      h = Math.imul(h ^ (h >>> 13), 3266489909);
      h ^= h >>> 16;
      return h >>> 0;
    };
  }

  function mulberry32(seed) {
    let a = seed;
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function createRng(seed) {
    const next = mulberry32(xmur3(String(seed))());
    return {
      next,
      float: (min, max) => min + next() * (max - min),
      int: (min, max) => min + Math.floor(next() * (max - min + 1)),
      pick: (list) => list[Math.floor(next() * list.length)],
      shuffle(list) {
        for (let i = list.length - 1; i > 0; i--) {
          const j = Math.floor(next() * (i + 1));
          const tmp = list[i];
          list[i] = list[j];
          list[j] = tmp;
        }
        return list;
      }
    };
  }

  function randomSeed() {
    const values = new Uint32Array(1);
    crypto.getRandomValues(values);
    return values[0].toString(16).toUpperCase().padStart(8, '0');
  }

  function makeItem(image, x, y, scale) {
    return {
      image,
      x,
      y,
      w: image.width * scale,
      h: image.height * scale,
      cos: 1,
      sin: 0,
      scale: 1,
      pop: 0,
      timing: 0,
      tIn: 0,
      tOut: Infinity
    };
  }

  function buildScene(o) {
    const visual = createRng(o.seed);
    const audio = createRng(o.seed + '#snd');
    const height = LOGICAL_HEIGHT;
    const width = height * o.aspect;
    const items = [];

    let x = START_OFFSET;
    let y = START_OFFSET;
    let guard = 0;
    while (x <= width && guard < MAX_STICKERS) {
      guard++;
      const item = makeItem(visual.pick(o.pool), x, y, o.stickerScale);
      x += item.w * o.spacing;
      if (x >= width && y <= height) {
        x = START_OFFSET;
        y += visual.float(o.rowMin, o.rowMax);
      }
      const angle = visual.int(o.angleMin, o.angleMax) * RAD;
      item.cos = Math.cos(angle);
      item.sin = Math.sin(angle);
      items.push(item);
    }

    visual.shuffle(items);

    const finalPool = o.last && o.last.length ? o.last : o.pool;
    const center = makeItem(visual.pick(finalPool), 0, 0, o.stickerScale);
    center.x = (width - center.w) / 2;
    center.y = (height - center.h) / 2;
    items.push(center);

    const count = items.length;
    items.forEach((item, index) => {
      item.timing = (index / count) * o.cover;
      item.pop = (index === count - 1 ? 2 : visual.int(0, 2)) * POP_FRAME;
      item.scale = visual.float(o.scaleMin, o.scaleMax);
    });

    const lastTiming = items[count - 1].timing;
    let fullAt = 0;
    for (const item of items) fullAt = Math.max(fullAt, item.timing + item.pop);

    let duration;
    if (o.mode === 'in') {
      for (const item of items) {
        item.tIn = item.timing;
        item.tOut = Infinity;
      }
      duration = fullAt + o.hold + TAIL;
    } else if (o.mode === 'out') {
      for (const item of items) {
        item.tIn = -1;
        item.tOut = o.hold + item.timing;
      }
      duration = o.hold + lastTiming + TAIL;
    } else {
      const outStart = fullAt + o.hold;
      for (const item of items) {
        item.tIn = item.timing;
        item.tOut = outStart + item.timing;
      }
      duration = outStart + lastTiming + TAIL;
    }

    const events = [];
    const groups = o.soundGroups || [];
    if (groups.length) {
      const chooseGroup = () => groups.find((g) => g.name === o.soundGroup) || audio.pick(groups);
      const schedule = (group, key) => {
        for (const item of items) events.push({ t: item[key], buffer: audio.pick(group.buffers) });
      };
      if (o.mode !== 'out') schedule(chooseGroup(), 'tIn');
      if (o.mode !== 'in') schedule(chooseGroup(), 'tOut');
      events.sort((a, b) => a.t - b.t);
    }

    return { items, events, duration, count, width, height, fullAt };
  }

  function drawFrame(ctx, scene, t, cw, ch, background) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cw, ch);

    if (background) {
      if (background.type === 'color') {
        ctx.fillStyle = background.color;
        ctx.fillRect(0, 0, cw, ch);
      } else if (background.type === 'image' && background.image) {
        const img = background.image;
        const ratio = Math.max(cw / img.width, ch / img.height);
        const dw = img.width * ratio;
        const dh = img.height * ratio;
        ctx.drawImage(img, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
      }
    }
    if (!scene) return;

    const k = ch / LOGICAL_HEIGHT;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    const items = scene.items;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (t < item.tIn || t >= item.tOut) continue;
      const s = (t < item.tIn + item.pop ? 1 : item.scale) * k;
      ctx.setTransform(item.cos * s, item.sin * s, -item.sin * s, item.cos * s, (item.x + item.w / 2) * k, (item.y + item.h / 2) * k);
      ctx.drawImage(item.image.bitmap, -item.w / 2, -item.h / 2, item.w, item.h);
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  window.FNF = window.FNF || {};
  window.FNF.engine = { LOGICAL_HEIGHT, TAIL, createRng, randomSeed, buildScene, drawFrame };
})();
