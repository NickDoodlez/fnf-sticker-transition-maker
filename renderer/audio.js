(function () {
  'use strict';

  let context = null;

  function getContext() {
    if (!context) context = new AudioContext({ latencyHint: 'interactive' });
    return context;
  }

  async function resume() {
    const ctx = getContext();
    if (ctx.state === 'suspended') {
      try {
        await ctx.resume();
      } catch {}
    }
    return ctx;
  }

  function decode(arrayBuffer) {
    return getContext().decodeAudioData(arrayBuffer);
  }

  function play(buffer, volume) {
    const ctx = getContext();
    const source = ctx.createBufferSource();
    const gain = ctx.createGain();
    source.buffer = buffer;
    gain.gain.value = volume;
    source.connect(gain);
    gain.connect(ctx.destination);
    source.start();
  }

  function encodeWav(buffer) {
    const channels = buffer.numberOfChannels;
    const length = buffer.length;
    const rate = buffer.sampleRate;
    const dataBytes = length * channels * 2;
    const out = new ArrayBuffer(44 + dataBytes);
    const view = new DataView(out);
    const text = (offset, value) => {
      for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i));
    };
    text(0, 'RIFF');
    view.setUint32(4, 36 + dataBytes, true);
    text(8, 'WAVE');
    text(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, channels, true);
    view.setUint32(24, rate, true);
    view.setUint32(28, rate * channels * 2, true);
    view.setUint16(32, channels * 2, true);
    view.setUint16(34, 16, true);
    text(36, 'data');
    view.setUint32(40, dataBytes, true);
    const data = [];
    for (let c = 0; c < channels; c++) data.push(buffer.getChannelData(c));
    let offset = 44;
    for (let i = 0; i < length; i++) {
      for (let c = 0; c < channels; c++) {
        const s = Math.max(-1, Math.min(1, data[c][i]));
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
        offset += 2;
      }
    }
    return out;
  }

  async function renderMix(events, seconds, volume) {
    const rate = 48000;
    const offline = new OfflineAudioContext(2, Math.max(1, Math.ceil(seconds * rate)), rate);
    const master = offline.createGain();
    master.gain.value = volume;
    master.connect(offline.destination);
    for (const event of events) {
      if (event.t >= seconds) continue;
      const source = offline.createBufferSource();
      source.buffer = event.buffer;
      source.connect(master);
      source.start(Math.max(0, event.t));
    }
    return encodeWav(await offline.startRendering());
  }

  window.FNF = window.FNF || {};
  window.FNF.audio = { resume, decode, play, renderMix };
})();
