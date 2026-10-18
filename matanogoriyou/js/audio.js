/* =========================================================
 * 効果音（Web Audio API で合成。外部音声ファイルなし）
 * ========================================================= */
(function () {
  'use strict';
  let ctx = null, master = null;
  let muted = false;
  try { muted = localStorage.getItem('mata-muted') === '1'; } catch (e) { /* 保存不可でも動作は続ける */ }

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.16;
    master.connect(ctx.destination);
  }

  function tone(freq, start, dur, type, vol, slideTo) {
    if (!ctx || muted) return;
    const t0 = ctx.currentTime + start;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol || 0.5, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(master);
    o.start(t0); o.stop(t0 + dur + 0.02);
  }
  function noise(start, dur, vol, freq) {
    if (!ctx || muted) return;
    const t0 = ctx.currentTime + start;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq || 800;
    const g = ctx.createGain(); g.gain.value = vol || 0.4;
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t0);
  }

  const SFX = {
    start: function () { tone(660, 0, 0.12, 'triangle', 0.4); tone(990, 0.1, 0.2, 'triangle', 0.4); },
    bow: function () { tone(784, 0, 0.14, 'sine', 0.35); tone(1047, 0.1, 0.25, 'sine', 0.35); },
    nod: function () { tone(523, 0, 0.18, 'sine', 0.25); },
    miss: function () { tone(440, 0, 0.16, 'triangle', 0.3); tone(392, 0.16, 0.26, 'triangle', 0.3); },
    timeout: function () { tone(330, 0, 0.35, 'sine', 0.25, 220); },
    cheerful: function () { tone(880, 0, 0.1, 'square', 0.12); tone(1175, 0.09, 0.1, 'square', 0.12); tone(1568, 0.18, 0.22, 'square', 0.12); },
    card: function () { tone(1319, 0, 0.09, 'triangle', 0.4); tone(1760, 0.08, 0.2, 'triangle', 0.4); },
    freeze: function () {
      tone(196, 0, 1.1, 'sawtooth', 0.18, 98); tone(208, 0, 1.1, 'sawtooth', 0.14, 104); tone(277, 0.02, 1.0, 'square', 0.08, 139);
    },
    stamp: function () { noise(0, 0.25, 0.7, 500); tone(110, 0, 0.25, 'sine', 0.6, 55); },
    result: function () { tone(523, 0, 0.15, 'triangle', 0.35); tone(659, 0.14, 0.15, 'triangle', 0.35); tone(784, 0.28, 0.35, 'triangle', 0.35); }
  };

  function play(name) { if (SFX[name]) { init(); SFX[name](); } }
  function setMuted(m) {
    muted = m;
    try { localStorage.setItem('mata-muted', m ? '1' : '0'); } catch (e) { /* noop */ }
    if (master) master.gain.value = m ? 0 : 0.16;
  }

  window.Sound = { init: init, play: play, setMuted: setMuted, isMuted: function () { return muted; } };
})();
