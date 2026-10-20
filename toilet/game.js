/* ここにトイレはありません — 俯瞰2D 短編誘導ゲーム
 * 単一スクリプト。Canvas 2D（ドット絵レイヤー＋高解像度レイヤー）と Web Audio のみで動作。
 */
(() => {
'use strict';

/* =========================================================
 * 基本定数・ユーティリティ
 * ======================================================= */
const LW = 960, LH = 540;          // 論理画面
const WW = 480, WH = 272;          // ワールド（1ワールド単位 = 2論理px）
const TS = 8, COLS = 60, ROWS = 34;
const WALL = 0, FLOOR = 1, BLUE = 2, STAIR = 3, OUT = 4;
const R0 = 64;                     // ピクトグラムの基本視認距離（倍率1）
const FONT = '"DotGothic16","Hiragino Kaku Gothic ProN","Hiragino Sans","Yu Gothic",Meiryo,sans-serif';
const SANS = '"Hiragino Kaku Gothic ProN","Hiragino Sans","Yu Gothic",Meiryo,sans-serif';

const $ = id => document.getElementById(id);
const rand = (a, b) => b === undefined ? Math.random() * a : a + Math.random() * (b - a);
const pick = a => a[(Math.random() * a.length) | 0];
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const ease = t => t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);
const hyp = Math.hypot;

const cv = $('cv'), ctx = cv.getContext('2d'), wrap = $('wrap');
let pxr = 1, wrapW = LW, portrait = false;

/* =========================================================
 * 画面サイズ（縦持ちは横向きに回転して表示）
 * ======================================================= */
function resize() {
  const vw = innerWidth, vh = innerHeight;
  portrait = vh > vw * 1.08;
  const aw = portrait ? vh : vw, ah = portrait ? vw : vh;
  const w = Math.min(aw, ah * LW / LH), h = w * LH / LW;
  wrapW = w;
  wrap.style.width = w + 'px'; wrap.style.height = h + 'px';
  wrap.style.transform = 'translate(-50%,-50%)' + (portrait ? ' rotate(90deg)' : '');
  wrap.style.fontSize = (w / LW * 16) + 'px';
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  const cw = Math.round(w * dpr), ch = Math.round(h * dpr);
  if (cv.width !== cw || cv.height !== ch) { cv.width = cw; cv.height = ch; }
  pxr = cw / LW;
}
addEventListener('resize', resize);
addEventListener('orientationchange', () => setTimeout(resize, 150));

function toLogical(clientX, clientY) {
  const r = wrap.getBoundingClientRect();
  const s = wrapW / LW;
  const dx = clientX - (r.left + r.width / 2), dy = clientY - (r.top + r.height / 2);
  const lx = portrait ? dy : dx, ly = portrait ? -dx : dy;
  return { x: lx / s + LW / 2, y: ly / s + LH / 2 };
}
const cam = { x: WW / 2, y: 135, zoom: 1, sx: 0, sy: 0, shake: 0, anim: null };
function toWorld(cx, cy) {
  const l = toLogical(cx, cy);
  return { x: (l.x - LW / 2 - cam.sx) / (2 * cam.zoom) + cam.x, y: (l.y - LH / 2 - cam.sy) / (2 * cam.zoom) + cam.y };
}
function w2s(x, y) {
  return { x: (x - cam.x) * 2 * cam.zoom + LW / 2 + cam.sx, y: (y - cam.y) * 2 * cam.zoom + LH / 2 + cam.sy };
}

/* =========================================================
 * 駅のマップ（タイル）
 * ======================================================= */
const map = new Uint8Array(COLS * ROWS);
function carve(c0, r0, c1, r1, t) { for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) map[r * COLS + c] = t; }
carve(1, 14, 57, 19, FLOOR);                          // コンコース
carve(14, 0, 19, 13, FLOOR); carve(14, 0, 19, 6, STAIR); // ホーム階段
carve(24, 6, 28, 13, FLOOR);                          // ロッカー通路（行き止まり）
carve(39, 4, 44, 13, BLUE);                           // 駅務室前の通路（行き止まり）
carve(51, 4, 56, 13, FLOOR); carve(51, 4, 59, 8, FLOOR); // 東口へ
carve(4, 20, 10, 26, FLOOR); carve(0, 27, 14, 33, OUT);  // 西口改札
carve(29, 20, 35, 26, FLOOR); carve(24, 27, 40, 33, OUT); // 南口改札
carve(46, 20, 51, 25, FLOOR);                         // 売店前（行き止まり）
const tileAt = (c, r) => (c < 0 || r < 0 || c >= COLS || r >= ROWS) ? WALL : map[r * COLS + c];
const solid = (x, y) => tileAt(Math.floor(x / TS), Math.floor(y / TS)) === WALL;
function los(x0, y0, x1, y1) {
  const d = hyp(x1 - x0, y1 - y0), n = Math.ceil(d / 3);
  for (let i = 1; i < n; i++) { const t = i / n; if (solid(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t)) return false; }
  return true;
}

/* 歩行グラフ（木構造） des = 「トイレがありそう」度合い */
const NODES = {
  E_W: { x: 60, y: 262, exit: 1 }, GW: { x: 60, y: 188, gate: 1 }, N_W: { x: 60, y: 136 },
  D_WE: { x: 20, y: 136, dead: 1, des: 0.8 },
  N_ST: { x: 136, y: 136 }, E_ST: { x: 136, y: 4, exit: 1 },
  N_L: { x: 212, y: 136 }, D_L: { x: 212, y: 60, dead: 1, des: 1.0 },
  N_S: { x: 260, y: 136 }, GS: { x: 260, y: 188, gate: 1 }, E_S: { x: 260, y: 262, exit: 1 },
  N_M: { x: 336, y: 136 }, D_M: { x: 336, y: 56, dead: 1, des: 2.6 },
  N_C: { x: 392, y: 136 }, D_C: { x: 392, y: 190, dead: 1, des: 1.1 },
  N_E: { x: 432, y: 136 }, N_E2: { x: 432, y: 52, des: 0.9 }, T: { x: 490, y: 52, exit: 1, toilet: 1, des: 0.9 },
};
const NID = Object.keys(NODES);
const EDGES = [['E_W', 'GW'], ['GW', 'N_W'], ['N_W', 'D_WE'], ['N_W', 'N_ST'], ['N_ST', 'E_ST'], ['N_ST', 'N_L'], ['N_L', 'D_L'],
  ['N_L', 'N_S'], ['N_S', 'GS'], ['GS', 'E_S'], ['N_S', 'N_M'], ['N_M', 'D_M'], ['N_M', 'N_C'], ['N_C', 'D_C'], ['N_C', 'N_E'],
  ['N_E', 'N_E2'], ['N_E2', 'T']];
const ADJ = {}, DIST = {}, NEXT = {};
NID.forEach(a => { ADJ[a] = []; DIST[a] = {}; NEXT[a] = {}; NID.forEach(b => { DIST[a][b] = a === b ? 0 : Infinity; NEXT[a][b] = a === b ? a : null; }); });
EDGES.forEach(([a, b]) => {
  ADJ[a].push(b); ADJ[b].push(a);
  const d = hyp(NODES[a].x - NODES[b].x, NODES[a].y - NODES[b].y);
  DIST[a][b] = DIST[b][a] = d; NEXT[a][b] = b; NEXT[b][a] = a;
});
NID.forEach(k => NID.forEach(i => NID.forEach(j => {
  if (DIST[i][k] + DIST[k][j] < DIST[i][j]) { DIST[i][j] = DIST[i][k] + DIST[k][j]; NEXT[i][j] = NEXT[i][k]; }
})));
const FIRST = { E_W: 'N_W', E_S: 'N_S', E_ST: 'N_ST', T: 'N_E' };
const ENTRANCES = ['E_W', 'E_S', 'E_ST'];

/* ポスターを貼れる壁（x,y = 壁面上の点、n = 壁の向き、s = 客が立つ位置、via = そこへ入るノード、marks = 「ここ」と解釈される場所） */
const SLOTS = [
  { name: '駅務室通路の奥',   x: 350, y: 32,  n: [0, 1],  s: [350, 44],  via: 'D_M',  marks: ['D_M'] },
  { name: '駅務室通路の壁',   x: 360, y: 92,  n: [-1, 0], s: [350, 92],  via: 'N_M',  marks: ['D_M'] },
  { name: '通路入口の横',     x: 384, y: 112, n: [0, 1],  s: [384, 124], via: 'N_C',  marks: ['D_M'] },
  { name: '南口改札の正面',   x: 260, y: 112, n: [0, 1],  s: [260, 124], via: 'N_S',  marks: ['N_S'] },
  { name: '西口改札の正面',   x: 60,  y: 112, n: [0, 1],  s: [60, 124],  via: 'N_W',  marks: ['N_W'] },
  { name: 'コンコース西端',   x: 8,   y: 136, n: [1, 0],  s: [18, 136],  via: 'D_WE', marks: ['D_WE'] },
  { name: 'コンコース東端',   x: 464, y: 136, n: [-1, 0], s: [454, 136], via: 'N_E',  marks: ['N_E'] },
  { name: 'ロッカー通路の奥', x: 212, y: 48,  n: [0, 1],  s: [212, 60],  via: 'D_L',  marks: ['D_L'] },
  { name: '売店前の奥',       x: 392, y: 208, n: [0, -1], s: [392, 198], via: 'D_C',  marks: ['D_C'] },
  { name: '東通路の突き当たり', x: 432, y: 32, n: [0, 1], s: [432, 44],  via: 'N_E2', marks: ['N_E2'] },
  { name: '階段下の壁',       x: 180, y: 160, n: [0, -1], s: [180, 150], via: 'N_ST', marks: ['N_ST'] },
  { name: '通路向かいの壁',   x: 336, y: 160, n: [0, -1], s: [336, 150], via: 'N_M',  marks: ['D_M'] },
];
SLOTS.forEach((s, i) => { s.id = i; s.fx = s.x + s.n[0] * 3; s.fy = s.y + s.n[1] * 3; s.poster = null; s.reserved = false; });
const SIGN = { x: 468, y: 34 };   // 東口の小さな本物のトイレ案内
const GATE_EYES = [{ x: 52, y: 200 }, { x: 68, y: 200 }, { x: 252, y: 200 }, { x: 268, y: 200 }, { x: 136, y: 44 }];

/* =========================================================
 * 視認判定
 * ======================================================= */
function seeInfo(sl, k, x, y, urg) {
  const dx = x - sl.fx, dy = y - sl.fy, d = hyp(dx, dy) || 0.01;
  const facing = (dx * sl.n[0] + dy * sl.n[1]) / d;
  if (facing < 0.08) return null;
  const range = R0 * k * (0.3 + 0.7 * facing) * (1 + 0.5 * urg);
  if (d > range) return null;
  if (!los(x, y, sl.fx, sl.fy)) return null;
  return { d, range };
}
const textRange = (k, urg) => 16 * (1 + 0.1 * (k - 1)) * (1 - 0.55 * urg);
const zoneCache = {}, gateCache = {};
function zoneTiles(si, k) {
  const key = si + '_' + k;
  if (zoneCache[key]) return zoneCache[key];
  const sl = SLOTS[si], arr = [];
  for (let r = 0; r < 31; r++) for (let c = 0; c < COLS; c++) {
    if (tileAt(c, r) === WALL) continue;
    if (seeInfo(sl, k, c * TS + 4, r * TS + 4, 0.3)) arr.push(c, r);
  }
  return (zoneCache[key] = arr);
}
function gateSee(si, k) {
  const key = si + '_' + k;
  if (gateCache[key] !== undefined) return gateCache[key];
  let n = 0; GATE_EYES.forEach(e => { if (seeInfo(SLOTS[si], k, e.x, e.y, 0.3)) n++; });
  return (gateCache[key] = n);
}

/* =========================================================
 * セリフ
 * ======================================================= */
const L = {
  explore: ['トイレどこー？', 'トイレ、トイレ……', 'どっちだろう……', 'トイレってどこ？', 'この辺にないかな', 'うーん、トイレ……'],
  exploreUrg: ['もれるー！', 'やばいやばい', 'まだ？ まだなの？', 'トイレぇ……', '急がないと……', 'ううう……'],
  exGrandma: ['お手洗いはどちらかしら', 'あらあら、どこかしら'],
  exKid: ['おしっこ……', 'トイレどこぉ'],
  exTourist: ['Toilet……？', 'トイレ、ドコ？'],
  deadEnd: ['ないなあ……', '行き止まりか', 'ここじゃないのか', 'あれ、ない'],
  spot: ['あっ、トイレのマーク！', 'あった！', '助かった！', 'こっちだ！', 'トイレ発見！', 'あそこだ！'],
  spotBig: ['でっかいトイレマーク！', 'あんなに大きく！ 絶対あそこだ！', '遠くからでも見える！'],
  spotAgain: ['今度こそ！', 'あっちにもマークが！', '次こそ本物だ！'],
  follow: ['え、トイレあるの？', 'みんな行ってる……！', 'ついて行こう', 'トイレ？ 私も！'],
  convert: ['あ、トイレ……行っとこうかな', 'そういえば行きたいかも', 'ついでに寄っとこう'],
  read: ['……ん？', '……', 'えーと……'],
  fooled: ['ええええ！？', 'なんだよ、トイレないのかよ！', '「ありません」……？', 'うそでしょ！？', 'ないの！？'],
  fooledUrg: ['もう限界なんですけど！', 'ここまで来たのに！？', 'うそだああ！'],
  fooledAgain: ['またかよ！', '紛らわしいんだよ！', '誰だよ、ここにあるって言ったの！', 'このマーク何なの！？', 'もうだまされないぞ……'],
  fooledFollow: ['誰だよ、ここにあるって言ったの！', 'つられて来ちゃった……', 'みんなで来て、ないの！？'],
  fooledBig: ['こんなに大きく描いといて！？', 'マークでかすぎでしょ！', '字が小さすぎる！'],
  informed: ['あ、ここはないのか', 'なんだ、ないのね', 'ないのか……じゃあ別か'],
  xSeen: ['あ、バツだ。ここじゃないな', 'トイレはないのね', '×か。じゃあ向こうかな', 'わかりやすい'],
  sign: ['あった！ 東口だ！', '東口か！', '最初からこっちに来れば……'],
  askQ: ['トイレどこですか？', 'すみません、トイレは？', 'あの、お手洗いは……？'],
  askQPoster: ['ポスター見て来たんですけど……トイレは？', 'あの、トイレのマークがあったんですけど……'],
  askA: ['別の出口の方にしかないんですよ', '東口の方にしかないんです', 'トイレは東口を出てすぐです'],
  askAPoster: ['ポスターにも書いてある通り、ここにはないんです……', 'あの……東口の方です'],
  askR: ['ええ……そんなあ', '遠いなあ……', '早く言ってよ！', '東口ね、ありがとう！'],
  giveup: ['もう外で探す！', 'コンビニ行く！', '限界……！'],
  gone: ['あれ？ 消えた……', 'あれ、マークは？'],
  rush: ['あっ！ トイレだ！', 'こっちこっち！', '急げえええ！', 'もれるううう！', 'トイレだああ！', 'どいてどいて！', 'あった！ あった！'],
};
const lastUsed = {};
function line(key) {
  const arr = L[key], hist = lastUsed[key] || (lastUsed[key] = []);
  let c, tries = 0;
  do { c = pick(arr); tries++; } while (hist.includes(c) && tries < 10);
  hist.push(c); if (hist.length > Math.min(3, arr.length - 1)) hist.shift();
  return c;
}

/* =========================================================
 * 見た目（客の種類）
 * ======================================================= */
const TYPES = {
  salary:  { w: 3, hair: ['#1d1d1d', '#2b2522'], skin: ['#f1c8a2', '#e8b98e'], top: ['#3b4252', '#2f3b55', '#4a4a4a'], bot: ['#262b36'], acc: 'tie', spd: 1.08 },
  ol:      { w: 2, hair: ['#5b3420', '#2a1d16', '#7a4a2a'], skin: ['#f6d3b4'], top: ['#e7a3b6', '#f2e1c4', '#9cc3e6'], bot: ['#34405e', '#5a4a3a'], acc: 'long', spd: 1 },
  student: { w: 2, hair: ['#161616'], skin: ['#efc29a'], top: ['#f2f2f2', '#1d2433'], bot: ['#27345e'], acc: 'bag', spd: 1.12 },
  grandma: { w: 1, hair: ['#cfcfcf', '#b9b9b9'], skin: ['#efcaa9'], top: ['#8e5aa8', '#a8645a'], bot: ['#54485f'], acc: 'bun', spd: 0.8 },
  kid:     { w: 1, hair: ['#2a1a10'], skin: ['#f7d0ae'], top: ['#e24b3b', '#3b8fe2', '#f0c02f'], bot: ['#2b4f8a'], acc: 'hat', spd: 0.95, small: true },
  tourist: { w: 1, hair: ['#e9c46a', '#c46a3a'], skin: ['#f7dac6'], top: ['#f08a24', '#26a69a'], bot: ['#4a6b3a', '#3a3a5a'], acc: 'pack', spd: 0.95 },
  oji:     { w: 1, hair: ['#8c8c8c'], skin: ['#e8b894'], top: ['#6b7f5a', '#7a6248'], bot: ['#4b4b4b'], acc: 'bald', spd: 0.9 },
};
const TYPE_KEYS = Object.keys(TYPES);
function pickType() {
  let tot = 0; TYPE_KEYS.forEach(k => tot += TYPES[k].w);
  let r = Math.random() * tot;
  for (const k of TYPE_KEYS) { r -= TYPES[k].w; if (r <= 0) return k; }
  return 'salary';
}
function makeLook(key) {
  const t = TYPES[key];
  return { hair: pick(t.hair), skin: pick(t.skin), top: pick(t.top), bot: pick(t.bot), acc: t.acc };
}
const MGR_LOOK = { hair: '#2b2522', skin: '#f0c49c', top: '#24345e', bot: '#1b2747', acc: 'cap' };

/* =========================================================
 * 音（Web Audio で生成）
 * ======================================================= */
const SONG = {
  mel: [72, 0, 69, 0, 65, 67, 69, 0, 74, 0, 72, 69, 0, 67, 65, 0, 70, 0, 69, 67, 0, 65, 67, 0, 67, 69, 72, 0, 76, 0, 72, 0],
  roots: [53, 50, 46, 48],
};
const AU = {
  ctx: null, master: null, mus: null, sfx: null, vol: 0.7, muted: false, nbuf: null,
  mode: 'none', step: 0, next: 0, intensity: 0, wind: null, rumble: null,
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    const c = this.ctx;
    this.master = c.createGain(); this.master.connect(c.destination);
    this.mus = c.createGain(); this.mus.gain.value = 0.55; this.mus.connect(this.master);
    this.sfx = c.createGain(); this.sfx.gain.value = 0.9; this.sfx.connect(this.master);
    const len = c.sampleRate * 2; this.nbuf = c.createBuffer(1, len, c.sampleRate);
    const d = this.nbuf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.apply();
    this.next = c.currentTime + 0.1;
    setInterval(() => this.tick(), 30);
  },
  apply() { if (this.master) this.master.gain.setTargetAtTime(this.muted ? 0 : this.vol * this.vol, this.ctx.currentTime, 0.05); },
  tone(f, d, o = {}) {
    const c = this.ctx; if (!c) return;
    const t = c.currentTime + (o.at || 0);
    const os = c.createOscillator(), g = c.createGain();
    os.type = o.type || 'square'; os.frequency.setValueAtTime(f, t);
    if (o.to) os.frequency.exponentialRampToValueAtTime(o.to, t + d);
    if (o.vib) { const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = o.vib; lg.gain.value = f * 0.04; l.connect(lg); lg.connect(os.frequency); l.start(t); l.stop(t + d + 0.1); }
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(o.v || 0.15, t + (o.a || 0.006));
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    os.connect(g); g.connect(o.dest || this.sfx); os.start(t); os.stop(t + d + 0.05);
  },
  noise(d, o = {}) {
    const c = this.ctx; if (!c) return;
    const t = c.currentTime + (o.at || 0);
    const src = c.createBufferSource(); src.buffer = this.nbuf;
    const f = c.createBiquadFilter(); f.type = o.ft || 'lowpass'; f.frequency.setValueAtTime(o.f || 1000, t);
    if (o.fto) f.frequency.exponentialRampToValueAtTime(o.fto, t + d);
    f.Q.value = o.q || 1;
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(o.v || 0.2, t + (o.a || 0.005));
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    src.connect(f); f.connect(g); g.connect(this.sfx); src.start(t, Math.random()); src.stop(t + d + 0.05);
  },
  note(m, t, d, type, v) {
    const c = this.ctx, f = 440 * Math.pow(2, (m - 69) / 12);
    const os = c.createOscillator(), g = c.createGain();
    os.type = type; os.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    os.connect(g); g.connect(this.mus); os.start(t); os.stop(t + d + 0.05);
  },
  setMusic(m) { this.mode = m; },
  tick() {
    const c = this.ctx; if (!c) return;
    if (this.mode === 'none') { this.next = c.currentTime + 0.05; return; }
    if (this.next < c.currentTime) this.next = c.currentTime + 0.02;
    while (this.next < c.currentTime + 0.15) {
      this.playStep(this.step, this.next);
      const bpm = this.mode === 'peace' ? 84 : this.mode === 'title' ? 96 : 100 + 52 * this.intensity;
      this.next += 60 / bpm / 2; this.step = (this.step + 1) % 32;
    }
  },
  playStep(i, t) {
    const I = this.intensity, root = SONG.roots[Math.floor(i / 8)], m = SONG.mel[i];
    if (this.mode === 'peace' || this.mode === 'title') {
      if (m) this.note(m, t, 0.5, 'triangle', 0.1);
      if (i % 4 === 0) this.note(root + (i % 8 === 4 ? 7 : 0), t, 0.7, 'triangle', 0.13);
      return;
    }
    if (m) this.note(m + (I > 0.75 && i % 2 ? 12 : 0), t, 0.17, 'square', 0.045);
    const bp = [0, 12, 7, 12, 0, 12, 7, 12];
    this.note(root + bp[i % 8], t, 0.2, 'triangle', 0.14);
    if (I > 0.3 && i % 2 === 1) {
      const src = this.ctx.createBufferSource(); src.buffer = this.nbuf;
      const f = this.ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7000;
      const g = this.ctx.createGain(); g.gain.setValueAtTime(0.05, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
      src.connect(f); f.connect(g); g.connect(this.mus); src.start(t, Math.random()); src.stop(t + 0.06);
    }
    if (I > 0.55 && i % 4 === 0) {
      const os = this.ctx.createOscillator(), g = this.ctx.createGain();
      os.frequency.setValueAtTime(150, t); os.frequency.exponentialRampToValueAtTime(45, t + 0.12);
      g.gain.setValueAtTime(0.25, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
      os.connect(g); g.connect(this.mus); os.start(t); os.stop(t + 0.16);
    }
  },
  chime() { [698, 880, 1047, 1397].forEach((f, i) => { this.tone(f, 1.2, { type: 'sine', v: 0.16, at: i * 0.3 }); this.tone(f * 2, 0.5, { type: 'sine', v: 0.03, at: i * 0.3 }); }); },
  paste() { this.noise(0.08, { f: 1800, v: 0.3 }); this.tone(150, 0.09, { type: 'sine', v: 0.25, to: 70 }); },
  tape() { this.noise(0.32, { ft: 'bandpass', f: 2600, fto: 900, q: 2, v: 0.28 }); this.noise(0.25, { ft: 'bandpass', f: 2200, fto: 700, q: 2, v: 0.22, at: 0.38 }); },
  blip(m) { this.tone(m ? 520 : 660, 0.05, { type: 'square', v: 0.035 }); },
  boo() { this.tone(330, 0.16, { type: 'square', v: 0.06, to: 230 }); this.tone(247, 0.24, { type: 'square', v: 0.05, to: 150, at: 0.12 }); },
  ding() { this.tone(1319, 0.25, { type: 'sine', v: 0.06 }); this.tone(1760, 0.35, { type: 'sine', v: 0.05, at: 0.08 }); },
  select() { this.tone(880, 0.05, { type: 'square', v: 0.05 }); },
  ng() { this.tone(200, 0.12, { type: 'square', v: 0.05 }); },
  unlock() { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.18, { type: 'square', v: 0.06, at: i * 0.07 })); },
  grow() { this.tone(300, 0.25, { type: 'square', v: 0.06, to: 900 }); this.paste(); },
  angry() { this.tone(120, 0.35, { type: 'sawtooth', v: 0.1, to: 85 }); },
  peel() { for (let i = 0; i < 6; i++) this.noise(0.05, { ft: 'highpass', f: 2200 + Math.random() * 2500, v: 0.14, at: i * 0.055 }); },
  scream() { this.tone(950, 1.6, { type: 'sawtooth', v: 0.1, to: 260, vib: 7 }); this.tone(1900, 1.4, { type: 'square', v: 0.03, to: 500, vib: 9 }); },
  loopNoise(ft, f, q) {
    const c = this.ctx; const src = c.createBufferSource(); src.buffer = this.nbuf; src.loop = true;
    const fl = c.createBiquadFilter(); fl.type = ft; fl.frequency.value = f; fl.Q.value = q;
    const g = c.createGain(); g.gain.value = 0.0001;
    src.connect(fl); fl.connect(g); g.connect(this.sfx); src.start();
    return { src, g, fl };
  },
  setWind(on) {
    const c = this.ctx; if (!c) return;
    if (on && !this.wind) {
      this.wind = this.loopNoise('bandpass', 480, 0.8);
      this.wind.g.gain.setTargetAtTime(0.32, c.currentTime, 0.8);
      const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = 0.25; lg.gain.value = 220;
      l.connect(lg); lg.connect(this.wind.fl.frequency); l.start(); this.wind.l = l;
    } else if (!on && this.wind) {
      const w = this.wind; this.wind = null;
      w.g.gain.setTargetAtTime(0.0001, c.currentTime, 0.5);
      setTimeout(() => { try { w.src.stop(); w.l.stop(); } catch (e) {} }, 2500);
    }
  },
  setRumble(on) {
    const c = this.ctx; if (!c) return;
    if (on && !this.rumble) {
      this.rumble = this.loopNoise('lowpass', 260, 0.7);
      this.rumble.g.gain.setTargetAtTime(0.55, c.currentTime, 1.2);
    } else if (!on && this.rumble) {
      const r = this.rumble; this.rumble = null;
      r.g.gain.setTargetAtTime(0.0001, c.currentTime, 0.3);
      setTimeout(() => { try { r.src.stop(); } catch (e) {} }, 1500);
    }
  },
};

/* =========================================================
 * ゲーム状態
 * ======================================================= */
const G = {
  mode: 'title', t: 0, phase: 'title', spawnMode: 'none', tool: null, unlocked: {}, maxPosters: 0,
  toolsLocked: false, mgrHold: false, selected: null, hover: null, fade: 0, wind: 0, speed: 1,
  seekAcc: 0, comAcc: 0, zoneFlash: null, bubbleCap: 8,
};
let S = {};
let people = [], posters = [], particles = [], floaters = [], askQ = [];
let PID = 0, POSTER_ID = 0, RUN = 0;
const timers = [], waiters = [];
const mgr = { kind: 'manager', look: MGR_LOOK };

function sleep(s) { const id = RUN; return new Promise(r => timers.push({ t: G.t + s, r, id })); }
function until(fn, timeout) { const id = RUN; return new Promise(r => waiters.push({ fn, r, id, tmax: timeout ? G.t + timeout : Infinity })); }

/* =========================================================
 * 移動（グラフ上を歩く）
 * ======================================================= */
function wpNode(p, id) {
  const n = NODES[id];
  let x = n.x + p.jx, y = n.y + p.jy;
  if (n.gate) x = n.x + (p.jx < 0 ? -8 : 8);
  return { x, y, node: id, anch: [id] };
}
function wpStand(p, sl) {
  let x = sl.s[0], y = sl.s[1];
  if (sl.n[1] !== 0) { x += p.jx * 0.9; y += Math.abs(p.jy) * 0.5 * sl.n[1]; }
  else { y += p.jy * 0.9; x += Math.abs(p.jx) * 0.5 * sl.n[0]; }
  return { x, y, node: null, anch: [sl.via] };
}
function routeTo(p, target, finalWp) {
  let best = p.anch[0], bd = Infinity;
  for (const a of p.anch) {
    const d = hyp(p.x - NODES[a].x, p.y - NODES[a].y) + DIST[a][target];
    if (d < bd) { bd = d; best = a; }
  }
  const path = [wpNode(p, best)];
  let c = best, guard = 0;
  while (c !== target && guard++ < 30) { c = NEXT[c][target]; path.push(wpNode(p, c)); }
  if (finalWp) path.push(finalWp);
  p.path = path;
}
function setDir(p, dx, dy) {
  if (Math.abs(dx) > Math.abs(dy) * 1.1) p.dir = dx < 0 ? 'l' : 'r';
  else if (Math.abs(dy) > 0.01) p.dir = dy < 0 ? 'u' : 'd';
}
function step(p, dt, spd) {
  if (!p.path.length) { p.moving = false; return true; }
  let left = spd * dt;
  while (left > 0 && p.path.length) {
    const w = p.path[0], dx = w.x - p.x, dy = w.y - p.y, d = hyp(dx, dy);
    if (d > 0.3) setDir(p, dx, dy);
    if (d <= left) {
      p.x = w.x; p.y = w.y; left -= d; p.path.shift();
      p.anchBase = w.anch; p.anch = w.anch;
      if (w.node) { p.cur = w.node; if (p.visited) p.visited.add(w.node); }
      if (p.lure) p.lure.walked += d;
    } else {
      p.x += dx / d * left; p.y += dy / d * left;
      if (p.lure) p.lure.walked += left;
      left = 0;
      p.anch = (w.node && !p.anchBase.includes(w.node)) ? p.anchBase.concat([w.node]) : p.anchBase;
    }
  }
  p.moving = true; p.walkT += dt * spd / 9;
  return p.path.length === 0;
}
function faceDir(sl) { return sl.n[1] === 1 ? 'u' : sl.n[1] === -1 ? 'd' : sl.n[0] === 1 ? 'l' : 'r'; }

/* =========================================================
 * 人物
 * ======================================================= */
function newPerson(kind, typeKey, from) {
  const tp = TYPES[typeKey], n = NODES[from];
  const p = {
    id: ++PID, kind, type: typeKey, look: makeLook(typeKey), small: !!tp.small,
    x: n.x + rand(-4, 4), y: n.y, jx: rand(-7, 7), jy: rand(-6, 6),
    path: [], anchBase: [from], anch: [from], cur: from, prev: null, dir: 'u', walkT: rand(10), moving: false,
    state: 'idle', stateT: 0, urg: 0, visited: new Set(), marked: new Set(), debunked: new Set(), ignore: new Map(), seen: new Set(),
    fooledN: 0, lure: null, knows: false, asked: false, panicT: 0, percT: rand(0.25), chatT: rand(2.5, 6), waitT: 0,
    expr: 'normal', exprT: 0, bubble: null, dead: false, speedMul: tp.spd * rand(0.92, 1.08), rush: false,
  };
  people.push(p);
  return p;
}
function spawnCommuter(from) {
  from = from || pick(['E_W', 'E_S', 'E_ST', 'E_ST', 'T']);
  const dests = ['E_W', 'E_S', 'E_ST', 'T'].filter(d => d !== from);
  const p = newPerson('commuter', pickType(), from);
  p.dest = pick(dests); p.state = 'commute';
  routeTo(p, p.dest);
  return p;
}
function spawnSeeker(o = {}) {
  const from = o.from || pick(['E_W', 'E_S', 'E_ST', 'E_ST']);
  const p = newPerson('seeker', o.type || pickType(), from);
  p.urg = o.urg !== undefined ? o.urg : clamp(rand(0.12, 0.5) + (from === 'E_ST' ? 0.12 : 0) + (G.phase === 'p2' ? 0.08 : 0), 0, 0.85);
  p.knows = o.knows !== undefined ? o.knows : Math.random() < 0.13;
  p.state = 'explore';
  if (o.script === 'toManager') { p.visited.add('N_S'); routeTo(p, 'D_M'); }
  else if (p.knows) { p.state = 'toToilet'; routeTo(p, 'T'); }
  else routeTo(p, FIRST[from]);
  if (Math.random() < 0.45) say(p, line(exploreKey(p)), { pri: 0 });
  return p;
}
function exploreKey(p) {
  if (p.type === 'grandma' && Math.random() < 0.7) return 'exGrandma';
  if (p.type === 'kid' && Math.random() < 0.7) return 'exKid';
  if (p.type === 'tourist' && Math.random() < 0.5) return 'exTourist';
  return p.urg > 0.65 ? 'exploreUrg' : 'explore';
}

/* 吹き出し */
function bubbleCount() { let n = mgr.bubble ? 1 : 0; for (const p of people) if (p.bubble) n++; return n; }
function say(p, text, o = {}) {
  const pri = o.pri === undefined ? 1 : o.pri;
  if (pri < 3) {
    if (G.quiet) return;
    const n = bubbleCount(), cap = G.bubbleCap + (pri === 2 ? 3 : pri === 0 ? -4 : 0);
    if (n >= cap) return;
  }
  p.bubble = { text, kind: o.kind || 'say', t: 0, dur: o.dur || Math.max(1.5, text.length * 0.12 + 0.9) };
  if (pri >= 2 && G.mode === 'play') AU.blip(p.kind === 'manager');
}
function floater(x, y, text, o = {}) {
  floaters.push({ x, y, text, t: 0, dur: o.dur || 1.2, color: o.color || '#fff', size: o.size || 12, vy: o.vy === undefined ? -10 : o.vy, screen: !!o.screen });
}
function particle(o) { particles.push(Object.assign({ t: 0, vx: 0, vy: 0, dur: 1 }, o)); }

/* =========================================================
 * 客の判断
 * ======================================================= */
function branchValue(p, c, n) {
  let best = 0;
  for (const m of NID) {
    if (m === c || NEXT[c][m] !== n) continue;
    const nd = NODES[m]; if (!nd.des) continue;
    let s = nd.des;
    if (p.visited.has(m)) s *= 0.08;
    if (p.marked.has(m)) s *= 0.04;
    let k = NEXT[c][m], g = 0;
    while (k !== m && g++ < 20) { if (p.marked.has(k)) s *= 0.45; k = NEXT[k][m]; }
    s /= (1 + DIST[c][m] / 220);
    if (s > best) best = s;
  }
  return best;
}
function exploreNext(p) {
  const c = p.cur;
  if (NODES[c].toilet) { arrive(p); return; }
  let opts = [], tot = 0;
  const calc = () => {
    opts = []; tot = 0;
    for (const n of ADJ[c]) {
      if (NODES[n].exit && !NODES[n].toilet) continue;
      let v = branchValue(p, c, n);
      if (n === p.prev) v *= 0.3;
      opts.push([n, v]); tot += v;
    }
  };
  calc();
  if (tot < 0.02) { p.visited.clear(); p.visited.add(c); calc(); }
  if (!opts.length) { routeTo(p, p.prev || FIRST[p.cur] || 'N_S'); return; }
  let r = 0; opts.forEach(o => { o[1] = o[1] * o[1] + 0.003; r += o[1]; });
  r *= Math.random();
  let target = opts[0][0];
  for (const [n, v] of opts) { r -= v; if (r <= 0) { target = n; break; } }
  p.prev = c;
  routeTo(p, target);
}
function onExploreArrive(p) {
  if (p.cur === 'T') { arrive(p); return; }
  const nd = NODES[p.cur];
  if (nd.dead && p.cur !== 'D_M') {
    p.urg = Math.min(1, p.urg + 0.03);
    if (Math.random() < 0.45) say(p, line('deadEnd'), { pri: 0 });
  }
  exploreNext(p);
}
function arrive(p) {
  S.arrived++; p.dead = true;
  if (Math.random() < 0.5) floater(476, 46, Math.random() < 0.5 ? '助かった〜！' : 'ふう……', { color: '#bff5cf', size: 11 });
  if (G.phase !== 'end' && Math.random() < 0.6) AU.ding();
  bumpChip('st-arr');
}
function markAll(p, marks) { marks.forEach(m => p.marked.add(m)); }

function startLure(p, poster, followed) {
  const sl = SLOTS[poster.slot];
  p.state = 'lured';
  p.lure = { p: poster, slot: poster.slot, walked: 0, followed };
  routeTo(p, sl.via, wpStand(p, sl));
  p.expr = 'shock'; p.exprT = 0.6;
  if (followed) return;
  const big = poster.scale >= 2 && hyp(p.x - sl.fx, p.y - sl.fy) > 70;
  say(p, line(p.fooledN > 0 ? 'spotAgain' : big ? 'spotBig' : 'spot'), { pri: 1, kind: 'shout' });
  // 周りの客がつられる
  for (const o of people) {
    if (o === p || o.dead || hyp(o.x - p.x, o.y - p.y) > 50) continue;
    if (o.kind === 'seeker' && o.state === 'explore' && !o.debunked.has(poster.id) && Math.random() < 0.3 + 0.4 * o.urg) {
      startLure(o, poster, true);
      if (Math.random() < 0.45) say(o, line('follow'), { pri: 0 });
    } else if (o.kind === 'commuter' && Math.random() < 0.12) {
      convert(o); startLure(o, poster, true);
      if (Math.random() < 0.6) say(o, line('follow'), { pri: 0 });
    }
  }
}
function convert(p) {
  p.kind = 'seeker'; p.urg = rand(0.2, 0.45); p.state = 'explore'; p.dest = null;
  p.knows = false; S.converted++;
}
function abortLure(p, why) {
  const l = p.lure; p.lure = null;
  if (why === 'gone') say(p, line('gone'), { pri: 0 });
  if (p.knows) { p.state = 'toToilet'; routeTo(p, 'T'); return; }
  p.state = 'explore';
  // いま居る区間の端点まで戻ってから探索を再開
  let best = p.anch[0], bd = Infinity;
  for (const a of p.anch) { const d = hyp(p.x - NODES[a].x, p.y - NODES[a].y); if (d < bd) { bd = d; best = a; } }
  p.prev = null;
  routeTo(p, best);
  void l;
}
function readPoster(p) {
  const l = p.lure, poster = l.p;
  p.lure = null;
  if (poster.slot === null || poster.slot !== l.slot) { p.state = 'explore'; abortLureFallback(p); return; }
  const sl = SLOTS[poster.slot];
  p.debunked.add(poster.id); markAll(p, sl.marks);
  if (poster.taped && G.phase !== 'end') {
    say(p, line('xSeen'), { pri: 0 });
    p.state = 'react'; p.stateT = 0.4; p.reactSlot = sl;
    return;
  }
  if (l.walked >= 24) {
    S.fooled++; poster.fooled++; S.lastFoolT = G.t; p.fooledN++;
    p.urg = Math.min(1, p.urg + 0.06 + l.walked / 1800);
    p.expr = 'angry'; p.exprT = 3.2;
    let key = 'fooled';
    if (p.fooledN >= 2) key = 'fooledAgain';
    else if (l.followed && Math.random() < 0.6) key = 'fooledFollow';
    else if (poster.scale >= 3 && Math.random() < 0.5) key = 'fooledBig';
    else if (p.urg > 0.8) key = 'fooledUrg';
    say(p, line(key), { pri: 2, kind: 'shout' });
    floater(p.x, p.y - 16, '✕', { color: '#ff5a4f', size: 14, vy: -14 });
    if (G.phase !== 'end') { AU.boo(); bumpChip('st-fool'); }
    p.state = 'react'; p.stateT = 1.15;
    for (let i = 0; i < 3; i++) particle({ type: 'steam', x: p.x + rand(-3, 3), y: p.y - 13, vx: rand(-6, 6), vy: rand(-14, -8), dur: 0.8 });
  } else {
    say(p, line('informed'), { pri: 0 });
    p.state = 'react'; p.stateT = 0.5;
  }
  p.reactSlot = sl;
}
function abortLureFallback(p) { say(p, line('gone'), { pri: 0 }); p.prev = null; exploreNext(p); }
function afterReact(p) {
  const sl = p.reactSlot; p.reactSlot = null;
  if (sl) { p.cur = sl.via; }
  if (p.knows) { p.state = 'toToilet'; routeTo(p, 'T'); return; }
  p.state = 'explore'; p.prev = null;
  exploreNext(p);
}

function perceive(p) {
  const urg = p.kind === 'commuter' ? 0.2 : p.urg;
  if (p.kind === 'seeker' && !p.knows && (p.state === 'explore' || p.state === 'lured')) {
    const d = hyp(p.x - SIGN.x, p.y - SIGN.y);
    if (d < 48 && p.y > SIGN.y && los(p.x, p.y, SIGN.x, SIGN.y + 2)) {
      p.knows = true; p.lure = null; p.state = 'toToilet'; routeTo(p, 'T');
      say(p, line('sign'), { pri: 1 }); p.expr = 'happy'; p.exprT = 2;
      return;
    }
  }
  let bestP = null, bestS = 0;
  for (const po of posters) {
    if (po.slot === null) continue;
    const sl = SLOTS[po.slot];
    const v = seeInfo(sl, po.scale, p.x, p.y, urg);
    if (!v) continue;
    const xed = po.taped && G.phase !== 'end';
    if (p.kind === 'commuter') {
      if (xed || p.seen.has(po.id) || G.phase === 'intro' || G.phase === 'title') continue;
      p.seen.add(po.id);
      if (Math.random() < 0.05 * Math.pow(po.scale, 1.4)) {
        convert(p); say(p, line('convert'), { pri: 0 }); startLure(p, po, true);
        return;
      }
      continue;
    }
    if (p.debunked.has(po.id)) continue;
    if (xed) {
      p.debunked.add(po.id); markAll(p, sl.marks); S.xSeen++;
      if (p.lure && p.lure.p === po) { p.lure = null; p.state = 'explore'; abortLure(p); }
      if (Math.random() < 0.35) say(p, line('xSeen'), { pri: 0 });
      continue;
    }
    if (p.lure && p.lure.p === po) continue;
    if (v.d <= textRange(po.scale, urg)) {
      p.debunked.add(po.id); markAll(p, sl.marks);
      if (Math.random() < 0.5) say(p, line('informed'), { pri: 0 });
      continue;
    }
    if ((p.ignore.get(po.id) || 0) > G.t) continue;
    const s = v.range / Math.max(v.d, 8);
    if (s > bestS) { bestS = s; bestP = po; }
  }
  if (!bestP) return;
  let prob;
  if (p.state === 'toToilet') prob = p.urg > 0.75 ? 0.3 : 0.04;
  else if (p.state === 'lured') prob = 0.3;
  else prob = Math.max(0.15 + 0.5 * p.urg, (0.55 + 0.45 * p.urg) * Math.pow(0.55, p.fooledN));
  if (Math.random() < prob) startLure(p, bestP, false);
  else p.ignore.set(bestP.id, G.t + 3.5);
}

/* 管理人に質問 */
function mgrAtHome() { return hyp(mgr.x - mgr.home.x, mgr.y - mgr.home.y) < 1.5; }
function mgrAvailable() { return (mgr.state === 'idle' || mgr.state === 'talk') && !mgr.queue.length && mgrAtHome() && !G.mgrHold && askQ.length < 4; }
function startAsk(p) {
  p.state = 'askWait'; p.waitT = 0; p.asked = true;
  const i = askQ.length;
  askQ.push(p);
  p.path = [{ x: mgr.home.x + 5 + (i % 3) * 7, y: mgr.home.y + 14 + Math.floor(i / 3) * 5, node: null, anch: ['D_M'] }];
}
async function converse(p) {
  mgr.state = 'talk'; p.state = 'ask'; p.inConv = true;
  const first = S.asks === 0;
  p.dir = 'u'; mgr.dir = 'd';
  const hasPoster = posters.length > 0;
  say(p, first ? 'トイレどこですか？' : (hasPoster && p.fooledN > 0 ? line('askQPoster') : line('askQ')), { pri: 2, dur: 1.7 });
  await sleep(1.6);
  const ans = first ? '別の出口の方にしかないんですよ' : (hasPoster && Math.random() < 0.6 ? line('askAPoster') : line('askA'));
  say(mgr, ans, { pri: 3, dur: 2.1 });
  if (G.phase === 'intro') showMsg('管理人', ans, 2.1);
  await sleep(2.0);
  say(p, first ? 'ええ……そんなあ' : line('askR'), { pri: 2, dur: 1.5 });
  p.expr = 'worry'; p.exprT = 1.5;
  await sleep(0.9);
  S.asks++; bumpChip('st-ask');
  p.inConv = false; p.knows = true; p.state = 'toToilet'; routeTo(p, 'T');
  if (mgr.state === 'talk') mgr.state = 'idle';
  if (G.phase !== 'intro' && Math.random() < 0.35) { await sleep(0.4); if (!mgr.bubble) say(mgr, pick(['はあ……', '今日もか……', 'ポスター、見てないのかな……']), { pri: 1, kind: 'think', dur: 1.6 }); }
}

/* =========================================================
 * 更新：客
 * ======================================================= */
function updatePerson(p, dt) {
  p.stateT -= dt;
  if (p.exprT > 0) { p.exprT -= dt; if (p.exprT <= 0) p.expr = 'normal'; }
  if (p.bubble) { p.bubble.t += dt; if (p.bubble.t > p.bubble.dur) p.bubble = null; }
  if (p.kind === 'commuter') {
    if (step(p, dt, 30 * p.speedMul)) p.dead = true;
    p.percT -= dt;
    if (p.percT <= 0) { p.percT = 0.3 + rand(0.1); if (posters.length) perceive(p); }
    return;
  }
  updateSeeker(p, dt);
}
function updateSeeker(p, dt) {
  const ending = G.phase === 'end';
  if (!p.rush) p.urg = Math.min(1, p.urg + dt * 0.009);
  if (p.urg >= 1 && !ending) p.panicT += dt;
  const spd = 30 * p.speedMul * (1 + 0.75 * p.urg) * (p.rush ? 1.75 : 1);
  switch (p.state) {
    case 'explore':
      if (step(p, dt, spd)) onExploreArrive(p);
      break;
    case 'lured': {
      const lp = p.lure.p;
      if (lp.slot !== p.lure.slot) { abortLure(p, 'gone'); break; }
      if (step(p, dt, spd)) {
        p.state = 'read'; p.stateT = p.rush ? 0.5 : 0.85; p.dir = faceDir(SLOTS[lp.slot]);
        if (Math.random() < 0.4) say(p, line('read'), { dur: 0.8, pri: 0 });
      }
      break;
    }
    case 'read':
      p.moving = false;
      if (p.stateT <= 0) readPoster(p);
      break;
    case 'react':
      p.moving = false;
      if (p.stateT <= 0) afterReact(p);
      break;
    case 'toToilet':
      if (step(p, dt, spd)) { if (p.cur === 'T') arrive(p); else routeTo(p, 'T'); }
      break;
    case 'askWait':
      step(p, dt, spd * 0.7); if (!p.path.length) p.dir = 'u';
      p.waitT += dt;
      if (p.waitT > 8 && !p.inConv) {
        const i = askQ.indexOf(p); if (i >= 0) askQ.splice(i, 1);
        say(p, 'いないのかな……', { pri: 0 });
        p.state = 'explore'; p.cur = 'D_M'; p.anch = ['D_M']; p.prev = null; p.marked.add('D_M');
        routeTo(p, 'N_M');
      }
      break;
    case 'ask': p.moving = false; break;
    case 'leave':
      if (step(p, dt, spd)) p.dead = true;
      break;
    case 'script':
      if (step(p, dt, spd)) p.moving = false;
      break;
  }
  p.percT -= dt;
  if (p.percT <= 0) {
    p.percT = 0.2 + rand(0.06);
    if (p.state === 'explore' || p.state === 'lured' || p.state === 'toToilet') perceive(p);
  }
  if (!p.asked && p.state === 'explore' && !ending && mgrAvailable() && hyp(p.x - mgr.x, p.y - mgr.y) < 34) startAsk(p);
  if (p.state === 'explore' && !ending) {
    p.chatT -= dt;
    if (p.chatT <= 0) { p.chatT = rand(4.5, 8); say(p, line(exploreKey(p)), { pri: 0 }); }
  }
  if (p.panicT > 10 && p.state === 'explore' && !ending) {
    let best = 'E_S', bd = Infinity;
    ENTRANCES.forEach(e => { const d = hyp(p.x - NODES[e].x, p.y - NODES[e].y); if (d < bd) { bd = d; best = e; } });
    p.state = 'leave'; routeTo(p, best);
    say(p, line('giveup'), { pri: 2, kind: 'shout' }); S.gaveUp++;
  }
  if (p.urg > 0.72 && Math.random() < dt * p.urg * 0.9) particle({ type: 'sweat', x: p.x + (Math.random() < 0.5 ? -4 : 4), y: p.y - 11, vx: rand(-4, 4), vy: -6, dur: 0.6 });
}

/* =========================================================
 * 管理人
 * ======================================================= */
function resetManager() {
  Object.assign(mgr, {
    x: 318, y: 42, home: { x: 318, y: 42 }, jx: 0, jy: 0, path: [], anch: ['D_M'], anchBase: ['D_M'], cur: 'D_M',
    dir: 'd', walkT: 0, moving: false, state: 'idle', queue: [], workT: 0, expr: 'tired', exprT: 0, bubble: null, carry: null,
  });
}
function queueTask(t) { mgr.queue.push(t); }
function validTask(t) {
  switch (t.type) {
    case 'place': return !SLOTS[t.slot].poster;
    case 'move': return t.picked ? !SLOTS[t.to].poster : (posters.includes(t.poster) && t.poster.slot !== null && !SLOTS[t.to].poster);
    default: return posters.includes(t.poster) && t.poster.slot !== null;
  }
}
function dropTask(t) {
  if (t.type === 'place') SLOTS[t.slot].reserved = false;
  if (t.type === 'move') { SLOTS[t.to].reserved = false; if (t.picked && t.poster) { /* 持ち運び中なら元に戻す */
    const free = SLOTS.find(s => !s.poster && !s.reserved); if (free) { t.poster.slot = free.id; free.poster = t.poster; t.poster.carried = false; mgr.carry = null; } } }
  if (t.poster) t.poster.pend = Math.max(0, t.poster.pend - 1);
}
function beginTask() {
  const t = mgr.queue[0];
  if (!validTask(t)) { mgr.queue.shift(); dropTask(t); mgr.state = 'idle'; return; }
  const si = t.type === 'place' ? t.slot : (t.type === 'move' && t.picked) ? t.to : t.poster.slot;
  t.slotNow = si;
  const sl = SLOTS[si];
  routeTo(mgr, sl.via, { x: sl.s[0], y: sl.s[1] + (sl.n[1] === 1 ? 2 : 0), node: null, anch: [sl.via] });
  mgr.state = 'walk';
}
function finishWork() {
  const t = mgr.queue[0];
  if (!t) { mgr.state = 'idle'; return; }
  if (!validTask(t)) { mgr.queue.shift(); dropTask(t); mgr.state = 'idle'; return; }
  const sl = SLOTS[t.slotNow];
  switch (t.type) {
    case 'place': {
      const p = { id: ++POSTER_ID, slot: sl.id, scale: 1, scaleShow: 0.2, taped: false, tapeShow: 0, strips: [{ lift: 0, gone: false }, { lift: 0, gone: false }], fooled: 0, carried: false, pend: 0 };
      posters.push(p); sl.poster = p; sl.reserved = false; S.placed++;
      AU.paste(); G.zoneFlash = { slot: sl.id, k: 1, t: 0 };
      if (Math.random() < 0.5) say(mgr, pick(['よいしょ', 'ぺたっと', 'これでよし']), { pri: 1, dur: 1.2 });
      break;
    }
    case 'move': {
      const p = t.poster;
      if (!t.picked) {
        t.picked = true; SLOTS[p.slot].poster = null; p.slot = null; p.carried = true; mgr.carry = p;
        AU.peel(); beginTask(); return;
      }
      p.slot = sl.id; sl.poster = p; sl.reserved = false; p.carried = false; mgr.carry = null; p.pend = Math.max(0, p.pend - 1);
      p.scaleShow = p.scale * 0.6; AU.paste(); G.zoneFlash = { slot: sl.id, k: p.scale, t: 0 };
      break;
    }
    case 'remove': {
      const p = t.poster; sl.poster = null; posters.splice(posters.indexOf(p), 1);
      if (G.selected === p) G.selected = null;
      AU.peel(); for (let i = 0; i < 4; i++) particle({ type: 'paper', x: sl.x + rand(-4, 4), y: sl.y - 6, vx: rand(-10, 10), vy: rand(-10, 0), dur: 0.9 });
      break;
    }
    case 'scale': {
      const p = t.poster; p.pend = Math.max(0, p.pend - 1);
      if (p.scale >= 3) { p.scale = 1; toast('元の大きさに戻した'); AU.paste(); }
      else { p.scale++; AU.grow(); if (!S.saidGrow) { S.saidGrow = true; say(mgr, '大きくすれば、ちゃんと読んでもらえるはず', { pri: 3, dur: 2.2 }); } }
      S.maxScale = Math.max(S.maxScale, p.scale);
      G.zoneFlash = { slot: sl.id, k: p.scale, t: 0 };
      break;
    }
    case 'tape': {
      const p = t.poster; p.pend = Math.max(0, p.pend - 1);
      p.taped = true; p.tapeShow = 0; S.lastTapeT = G.t; AU.tape();
      if (Math.random() < 0.5) say(mgr, pick(['バツ、と', 'ぺたり', 'これで一目瞭然']), { pri: 1, dur: 1.2 });
      break;
    }
  }
  mgr.queue.shift(); mgr.state = 'idle';
  updatePosterCount();
}
function updateManager(dt) {
  if (mgr.bubble) { mgr.bubble.t += dt; if (mgr.bubble.t > mgr.bubble.dur) mgr.bubble = null; }
  if (mgr.exprT > 0) { mgr.exprT -= dt; if (mgr.exprT <= 0) mgr.expr = mgr.baseExpr || 'normal'; }
  if (G.phase === 'end' && !mgr.queue.length && mgr.state !== 'home') { mgr.moving = false; return; }
  switch (mgr.state) {
    case 'idle':
      if (mgr.queue.length) { beginTask(); break; }
      if (!mgrAtHome()) { mgr.state = 'home'; routeTo(mgr, 'D_M', { x: mgr.home.x, y: mgr.home.y, node: null, anch: ['D_M'] }); break; }
      mgr.moving = false; if (!mgr.lookAt) mgr.dir = 'd';
      if (askQ.length && !G.mgrHold) {
        const q = askQ[0];
        if (q.dead || q.state !== 'askWait') askQ.shift();
        else if (!q.path.length) { askQ.shift(); converse(q); }
      }
      break;
    case 'home':
      if (mgr.queue.length) { beginTask(); break; }
      if (step(mgr, dt, 70)) mgr.state = 'idle';
      break;
    case 'walk':
      if (step(mgr, dt, 85)) { mgr.state = 'work'; mgr.workT = 0.5; mgr.dir = faceDir(SLOTS[mgr.queue[0].slotNow]); }
      break;
    case 'work':
      mgr.moving = false; mgr.workT -= dt;
      if (mgr.workT <= 0) finishWork();
      break;
    case 'talk': mgr.moving = false; break;
  }
}

/* =========================================================
 * 出現
 * ======================================================= */
const RATES = { none: 0, title: 0, intro: 0, pause: 0, p1: 1 / 5.2, p2: 1 / 3.7, p4: 1 / 4.8, peace: 1 / 7.5 };
function outsideAttr() {
  let a = 0;
  for (const p of posters) {
    if (p.slot === null || p.taped) continue;
    a += Math.pow(p.scale, 1.5) * gateSee(p.slot, p.scale) * 0.5 + 0.15 * p.scale;
  }
  return a;
}
function spawning(dt) {
  const sm = G.spawnMode;
  if (sm !== 'none' && people.length < 70) {
    G.comAcc += dt * (sm === 'title' ? 1 / 1.6 : sm === 'peace' ? 1 / 3 : 1 / 2.4);
    while (G.comAcc >= 1) { G.comAcc -= 1; spawnCommuter(); }
  }
  const seekers = people.reduce((n, p) => n + (p.kind === 'seeker' ? 1 : 0), 0);
  const rate = (RATES[sm] || 0) * (1 + 0.35 * outsideAttr());
  if (rate > 0 && seekers < 46) {
    G.seekAcc += dt * rate;
    while (G.seekAcc >= 1) { G.seekAcc -= 1; spawnSeeker(); }
  }
}

/* 押し合い */
function separation(dt) {
  const n = people.length;
  for (let i = 0; i < n; i++) {
    const a = people[i];
    for (let j = i + 1; j < n; j++) {
      const b = people[j];
      const dx = b.x - a.x; if (dx > 5 || dx < -5) continue;
      const dy = b.y - a.y; if (dy > 4 || dy < -4) continue;
      const d = hyp(dx, dy * 1.25) || 0.01;
      if (d >= 5) continue;
      const f = (5 - d) / 5 * 16 * dt, ux = (dx || rand(-1, 1)) / d, uy = dy / d * 0.8;
      if (!solid(a.x - ux * f, a.y - uy * f)) { a.x -= ux * f; a.y -= uy * f; }
      if (!solid(b.x + ux * f, b.y + uy * f)) { b.x += ux * f; b.y += uy * f; }
    }
  }
}

/* =========================================================
 * メインループ
 * ======================================================= */
function update(dt) {
  G.t += dt;
  for (let i = timers.length - 1; i >= 0; i--) {
    const t = timers[i];
    if (t.id !== RUN) { timers.splice(i, 1); continue; }
    if (G.t >= t.t) { timers.splice(i, 1); t.r(); }
  }
  for (let i = waiters.length - 1; i >= 0; i--) {
    const w = waiters[i];
    if (w.id !== RUN) { waiters.splice(i, 1); continue; }
    if (G.t >= w.tmax || w.fn()) { waiters.splice(i, 1); w.r(); }
  }
  spawning(dt);
  for (const p of people) updatePerson(p, dt);
  if (G.mode !== 'title') updateManager(dt);
  separation(dt);
  if (people.some(p => p.dead)) {
    people = people.filter(p => !p.dead);
    for (let i = askQ.length - 1; i >= 0; i--) if (askQ[i].dead) askQ.splice(i, 1);
  }
  for (const p of posters) {
    p.scaleShow += (p.scale - p.scaleShow) * Math.min(1, dt * 7);
    if (p.taped && p.tapeShow < 1) p.tapeShow = Math.min(1, p.tapeShow + dt * 2.2);
  }
  for (const pa of particles) {
    pa.t += dt; pa.x += pa.vx * dt; pa.y += pa.vy * dt;
    if (pa.type === 'strip') { pa.vy += 55 * dt; pa.vx += (G.wind * 30 - pa.vx * 0.5) * dt; pa.rot += pa.vr * dt; }
    if (pa.type === 'paper') pa.vy += 30 * dt;
  }
  particles = particles.filter(pa => pa.t < pa.dur);
  for (const f of floaters) { f.t += dt; f.y += f.vy * dt; }
  floaters = floaters.filter(f => f.t < f.dur);
  if (G.wind > 0 && Math.random() < dt * 40 * G.wind) particle({ type: 'wind', x: -10, y: rand(20, 240), vx: rand(160, 260), vy: rand(-6, 6), len: rand(6, 16), dur: 3.5 });
  if (G.zoneFlash) { G.zoneFlash.t += dt; if (G.zoneFlash.t > 2.6) G.zoneFlash = null; }
  // カメラ
  if (cam.anim) {
    const a = cam.anim; a.t += dt; const e = ease(a.t / a.dur);
    cam.x = a.fx + (a.tx - a.fx) * e; cam.y = a.fy + (a.ty - a.fy) * e; cam.zoom = a.fz + (a.tz - a.fz) * e;
    if (a.t >= a.dur) cam.anim = null;
    const hw = LW / (4 * cam.zoom), hh = LH / (4 * cam.zoom);
    cam.x = clamp(cam.x, hw, WW - hw); cam.y = clamp(cam.y, hh, 270 - hh);
  }
  cam.sx = (Math.random() * 2 - 1) * cam.shake * 2; cam.sy = (Math.random() * 2 - 1) * cam.shake * 2;
  if (cam.decay) cam.shake = Math.max(0, cam.shake - dt * cam.decay);
  hudTick(dt);
}

let last = performance.now();
function frame(now) {
  let dt = (now - last) / 1000; last = now;
  if (dt > 0.1) dt = 0.1;
  const sp = G.speed;
  if (sp > 1) { for (let i = 0; i < sp; i++) update(dt); } else update(dt);
  render();
  requestAnimationFrame(frame);
}

/* =========================================================
 * 描画：背景（ドット絵、一度だけ生成）
 * ======================================================= */
const bg = document.createElement('canvas'); bg.width = WW; bg.height = WH;
const chars = document.createElement('canvas'); chars.width = WW; chars.height = WH;
const cg = chars.getContext('2d');

function buildBG() {
  const g = bg.getContext('2d');
  const R = (c, x, y, w, h) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
  R('#1a1e2c', 0, 0, WW, WH);
  // 床
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const t = tileAt(c, r), x = c * TS, y = r * TS;
    if (t === FLOOR) {
      R('#d2d5d8', x, y, 8, 8);
      if (c % 2 === 0) R('#c4c8cb', x, y, 1, 8);
      if (r % 2 === 0) R('#c4c8cb', x, y, 8, 1);
      if ((c * 7 + r * 13) % 5 === 0) R('#dadde0', x + 3, y + 4, 2, 1);
    } else if (t === BLUE) {
      R('#bdd7e9', x, y, 8, 8); R('#a9c6db', x, y, 1, 8); R('#a9c6db', x, y, 8, 1); R('#cfe3f1', x + 2, y + 2, 2, 1);
    } else if (t === STAIR) {
      for (let k = 0; k < 8; k += 4) { R('#e2e4e6', x, y + k, 8, 1); R('#b3b8bd', x, y + k + 1, 8, 3); }
    } else if (t === OUT) {
      R(r <= 28 ? '#8a8e95' : '#4c515a', x, y, 8, 8);
      if (r <= 28) { R('#7b7f86', x, y, 8, 1); R('#7b7f86', x, y, 1, 8); }
      else if ((c + r) % 3 === 0) R('#555a63', x + 2, y + 5, 2, 1);
    }
  }
  // 階段の手すり
  R('#7a8088', 112, 0, 2, 56); R('#7a8088', 158, 0, 2, 56);
  R('#d9c24a', 114, 55, 44, 1);
  // 壁
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    if (tileAt(c, r) !== WALL) continue;
    const x = c * TS, y = r * TS, below = tileAt(c, r + 1), above = tileAt(c, r - 1);
    if (below === FLOOR || below === BLUE || below === STAIR) {
      R('#e7e0cc', x, y, 8, 8); R('#d7cfb8', x, y + 3, 8, 1); R('#d7cfb8', x + (c % 2) * 4, y, 1, 8);
      R('#bdb39a', x, y, 8, 1); R('#7d7563', x, y + 7, 8, 1);
    } else if (below === OUT) {
      R('#4a5266', x, y, 8, 8); R('#5a6378', x, y, 8, 2); R('#39404f', x, y + 7, 8, 1);
    } else {
      R('#2b3041', x, y, 8, 8); R('#30364a', x + ((r % 2) * 4), y + 3, 4, 1);
      if (above !== WALL && above !== OUT) R('#545b72', x, y, 8, 2);
    }
    const left = tileAt(c - 1, r), right = tileAt(c + 1, r);
    if (below === WALL && (left === FLOOR || left === BLUE || left === STAIR)) R('#454c62', x, y, 1, 8);
    if (below === WALL && (right === FLOOR || right === BLUE || right === STAIR)) R('#454c62', x + 7, y, 1, 8);
  }
  // 床の影
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const t = tileAt(c, r); if (t === WALL || t === OUT) continue;
    const x = c * TS, y = r * TS;
    if (tileAt(c - 1, r) === WALL) R('rgba(0,0,0,.12)', x, y, 2, 8);
    if (tileAt(c + 1, r) === WALL) R('rgba(0,0,0,.08)', x + 7, y, 1, 8);
    if (tileAt(c, r - 1) === WALL) R('rgba(0,0,0,.14)', x, y, 8, 2);
  }
  // 点字ブロック
  const tactile = (x, y, w, h) => { R('#e3c04a', x, y, w, h); for (let i = 0; i < Math.max(w, h); i += 3) R('#c9a634', w > h ? x + i + 1 : x + 1, w > h ? y + 1 : y + i + 1, 1, 1); };
  tactile(24, 141, 418, 3); tactile(62, 144, 3, 96); tactile(262, 144, 3, 96); tactile(138, 58, 3, 83); tactile(434, 50, 3, 91); tactile(437, 50, 43, 3);
  // 改札機
  [44, 60, 76, 244, 260, 276].forEach(x => {
    R('rgba(0,0,0,.25)', x - 2, 194, 6, 2);
    R('#9aa3ad', x - 2, 181, 5, 13); R('#d4dbe2', x - 2, 181, 5, 2); R('#3d7bd9', x - 1, 185, 3, 2);
    R('#4ce07a', x, 183, 1, 1);
  });
  R('#e8505b', 37, 186, 2, 6); R('#e8505b', 81, 186, 2, 6); R('#e8505b', 237, 186, 2, 6); R('#e8505b', 281, 186, 2, 6);
  // 案内板（文字は高解像度レイヤー）
  const board = (x, y, w, h, c) => { R('#111', x + 1, y + 1, w, h); R(c, x, y, w, h); R('rgba(255,255,255,.18)', x, y, w, 1); };
  board(38, 166, 46, 7, '#1f3a68'); board(238, 166, 46, 7, '#1f3a68');
  board(118, 70, 36, 7, '#1f3a68'); board(414, 90, 36, 7, '#f2c230');
  // 駅務室の窓
  R('#6b7484', 310, 22, 22, 10); R('#9cc6e0', 312, 24, 18, 6); R('#c8e2f2', 313, 25, 6, 2); R('#8a6a4a', 310, 30, 22, 2);
  R('#2b3041', 312, 13, 18, 5); R('#ececec', 313, 14, 16, 3);
  // ロッカー
  for (let y = 48; y < 112; y += 8) for (const x of [184, 232]) { R('#5e7fa3', x, y, 8, 8); R('#4a6a8e', x, y + 7, 8, 1); R('#4a6a8e', x + 3, y, 1, 8); R('#d9d9d9', x + 1, y + 3, 1, 1); R('#d9d9d9', x + 5, y + 3, 1, 1); }
  for (const x of [192, 200, 224]) { R('#5e7fa3', x, 40, 8, 8); R('#4a6a8e', x + 3, 40, 1, 8); R('#4a6a8e', x, 47, 8, 1); }
  // 自動販売機（売店前）
  R('#d9443a', 361, 162, 7, 12); R('#f2f2f2', 362, 164, 5, 4); R('#ffd24a', 363, 170, 3, 1);
  R('#2f6fd1', 361, 178, 7, 12); R('#cfe8ff', 362, 180, 5, 4); R('#ffffff', 363, 186, 3, 1);
  R('#3aa865', 416, 166, 7, 12); R('#e8fff0', 417, 168, 5, 4);
  // 売店のシャッター
  R('#9aa0a8', 372, 202, 40, 6); for (let x = 372; x < 412; x += 2) R('#848a92', x, 202, 1, 6); R('#6b7078', 372, 202, 40, 1);
  // 工事中バリア
  for (let y = 114; y < 160; y += 4) { R('#f2c230', 9, y, 3, 2); R('#222', 9, y + 2, 3, 2); }
  R('#ff8a3d', 13, 118, 3, 4); R('#ff8a3d', 13, 152, 3, 4);
  // コンコース壁の広告・発車標・時計
  const ad = (x, c1, c2) => { R('#5b5546', x - 1, 98, 18, 13); R(c1, x, 99, 16, 11); R(c2, x + 2, 101, 12, 4); R('#fff', x + 2, 106, 8, 1); };
  ad(18, '#5aa9e6', '#ffffff'); ad(90, '#7bc67b', '#f4f4c0'); ad(164, '#f29e4c', '#fff3d6'); ad(400, '#c58ad8', '#ffe');
  R('#111', 284, 98, 34, 12); for (let i = 0; i < 3; i++) { R('#ff9a2e', 286, 100 + i * 3, 14, 1); R('#9aff8a', 304, 100 + i * 3, 10, 1); }
  R('#eee', 231, 99, 9, 9); R('#333', 235, 101, 1, 4); R('#333', 235, 104, 3, 1);
  // ベンチ・ゴミ箱
  const bench = x => { R('rgba(0,0,0,.2)', x, 158, 24, 2); R('#8b5a2b', x, 152, 24, 5); R('#a8703a', x, 152, 24, 1); R('#555', x + 2, 157, 2, 2); R('#555', x + 20, 157, 2, 2); };
  bench(90); bench(294);
  R('#4a6a8e', 204, 152, 6, 7); R('#6a8aae', 204, 152, 6, 1); R('#4a8a4e', 212, 152, 6, 7); R('#6aae6e', 212, 152, 6, 1);
  // 東口へ
  R('#f2f2f2', 462, 26, 10, 5); R('#1d5fc0', 463, 27, 3, 3); R('#fff', 464, 28, 1, 1); R('#222', 467, 28, 4, 1); R('#222', 470, 27, 1, 3);
  // 外：駅名看板・植え込み・街灯
  board(116, 208, 60, 7, '#24345e');
  for (const x of [2, 100, 302]) { R('#3a6b3a', x, 218, 14, 6); R('#4f8a4a', x + 1, 217, 12, 3); R('#6aa860', x + 3, 217, 3, 1); R('#5d4a3a', x, 224, 14, 2); }
  for (const x of [24, 226, 320]) { R('#333', x, 222, 1, 12); R('#ffe9a6', x - 1, 220, 3, 2); }
}

/* =========================================================
 * 描画：人物（ドット絵）
 * ======================================================= */
const GLYPH = { '?': ['111', '001', '010', '000', '010'], '!': ['1', '1', '1', '0', '1'] };
function glyph(g, ch, cx, y, color) {
  const rows = GLYPH[ch], w = rows[0].length, x0 = cx - Math.floor(w / 2);
  g.fillStyle = 'rgba(20,20,30,.85)';
  rows.forEach((row, j) => { for (let i = 0; i < w; i++) if (row[i] === '1') g.fillRect(x0 + i - 1, y + j - 1, 3, 3); });
  g.fillStyle = color;
  rows.forEach((row, j) => { for (let i = 0; i < w; i++) if (row[i] === '1') g.fillRect(x0 + i, y + j, 1, 1); });
}
function exprOf(p) {
  if (p.exprT > 0) return p.expr;
  if (p.kind === 'manager') return mgr.baseExpr || 'normal';
  if (p.kind !== 'seeker') return 'normal';
  if (p.state === 'toToilet') return p.urg > 0.8 ? 'worry' : 'normal';
  if (p.urg > 0.84) return 'panic';
  if (p.urg > 0.56) return 'worry';
  return 'normal';
}
function drawPerson(g, p) {
  const lk = p.look, sm = p.small, dir = p.dir;
  let x = Math.round(p.x), y = Math.round(p.y);
  if (p.kind === 'seeker' && p.urg > 0.7 && !p.moving && Math.random() < p.urg * 0.45) x += Math.random() < 0.5 ? -1 : 1;
  if (p.state === 'react' && p.stateT > 0.3) x += Math.round(Math.sin(G.t * 45));
  if (p.jump) y -= p.jump;
  const H = sm ? 10 : 12, ox = x - 3, oy = y - H;
  const fr = p.moving ? (Math.floor(p.walkT) % 4) : 0;
  const bob = p.moving && (fr === 1 || fr === 3) ? -1 : 0;
  const ex = exprOf(p);
  g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(x - 3, y - 1, 7, 2);
  const F = (c, cx, cy, w, h) => { g.fillStyle = c; g.fillRect(ox + cx, oy + cy + bob, w, h); };
  const FL = (c, cx, cy, w, h) => { g.fillStyle = c; g.fillRect(ox + cx, oy + cy, w, h); };
  const bodyH = sm ? 2 : 3, pantsR = 5 + bodyH, legTop = pantsR + 1, legH = sm ? 1 : 2, shoeR = legTop + legH;
  const shoe = p.kind === 'manager' ? '#111' : '#2a2420';
  // 脚
  if (dir === 'l' || dir === 'r') {
    const sp = p.moving ? (fr === 1 ? 1 : fr === 3 ? -1 : 0) : 0;
    FL(lk.bot, 2 - sp, legTop, 2, legH); FL(lk.bot, 3 + sp, legTop, 2, legH);
    FL(shoe, 2 - sp, shoeR, 2, 1); FL(shoe, 3 + sp, shoeR, 2, 1);
  } else {
    const l1 = fr === 1 ? 1 : 0, l2 = fr === 3 ? 1 : 0;
    const knees = !p.moving && p.kind === 'seeker' && p.urg > 0.6;
    const lx = knees ? 2 : 1, rx = knees ? 4 : 4;
    FL(lk.bot, lx, legTop - l1, 2, legH); FL(lk.bot, rx, legTop - l2, 2, legH);
    FL(shoe, lx, shoeR - l1, 2, 1); FL(shoe, rx, shoeR - l2, 2, 1);
  }
  // 胴体
  F(lk.bot, 1, pantsR, 5, 1);
  if (lk.acc === 'long' && dir !== 'u') F(lk.bot, 1, pantsR - 1, 5, 2);
  F(lk.top, 1, 5, 5, bodyH);
  const sw = p.moving ? (fr === 1 ? 1 : fr === 3 ? -1 : 0) : 0;
  const hand = lk.acc === 'cap' ? '#f4f4f4' : lk.skin;
  if (dir === 'd' || dir === 'u') {
    F(lk.top, 0, 5, 1, bodyH - 1 + (sw > 0 ? 1 : 0)); F(lk.top, 6, 5, 1, bodyH - 1 + (sw < 0 ? 1 : 0));
    F(hand, 0, 5 + bodyH - 1 + (sw > 0 ? 1 : 0), 1, 1); F(hand, 6, 5 + bodyH - 1 + (sw < 0 ? 1 : 0), 1, 1);
  } else {
    F(lk.top, 3 + sw, 5, 1, bodyH - 1); F(hand, 3 + sw, 5 + bodyH - 1, 1, 1);
  }
  // 小物
  if (lk.acc === 'tie' && dir === 'd') { F('#f4f4f4', 2, 5, 3, 1); F('#c0392b', 3, 5, 1, bodyH); }
  if (lk.acc === 'tie' && dir !== 'u') F('#5a3a1a', dir === 'l' ? 0 : 5, pantsR, 2, 2);
  if (lk.acc === 'cap') { if (dir === 'd') { F('#d9b44a', 3, 6, 1, 1); F('#f4f4f4', 2, 5, 3, 1); F('#c0392b', 3, 5, 1, 1); } }
  if (lk.acc === 'pack') { if (dir === 'u') F('#3f7f4f', 1, 4, 5, bodyH + 1); else if (dir === 'd') { F('#3f7f4f', 1, 5, 1, bodyH); F('#3f7f4f', 5, 5, 1, bodyH); } else F('#3f7f4f', dir === 'l' ? 5 : 0, 4, 2, bodyH + 1); }
  if (lk.acc === 'hat') { if (dir === 'u') F('#c0392b', 1, 5, 5, bodyH); else if (dir !== 'd') F('#c0392b', dir === 'l' ? 5 : 0, 5, 2, bodyH); }
  if (lk.acc === 'bag' && dir !== 'u') F('#3a2a1a', dir === 'l' ? 0 : 5, 6, 2, 2);
  // 頭
  let skin = lk.skin;
  if (ex === 'panic') skin = '#d5dcea';
  else if (ex === 'angry') skin = '#f3a08a';
  F(skin, 1, 0, 5, 5);
  const hair = lk.hair;
  if (lk.acc === 'bald') { F(hair, 1, 2, 1, 2); F(hair, 5, 2, 1, 2); if (dir === 'u') F(hair, 1, 2, 5, 2); }
  else if (lk.acc === 'cap') {
    F('#1b2747', 0, -1, 7, 2); F('#d9b44a', 1, 0, 5, 1);
    if (dir === 'd') F('#0f1730', 1, 1, 5, 1); else if (dir === 'l') F('#0f1730', 0, 1, 2, 1); else if (dir === 'r') F('#0f1730', 5, 1, 2, 1); else F(hair, 1, 1, 5, 3);
  } else if (lk.acc === 'hat') {
    F('#f2c94c', 0, -1, 7, 2); F('#e0b43a', 0, 0, 7, 1);
    if (dir === 'u') F(hair, 1, 1, 5, 3);
  } else {
    F(hair, 1, 0, 5, 2);
    if (dir === 'd') { F(hair, 1, 2, 1, 1); F(hair, 5, 2, 1, 1); }
    else if (dir === 'u') F(hair, 1, 2, 5, 2);
    else if (dir === 'l') F(hair, 4, 2, 2, 2);
    else F(hair, 1, 2, 2, 2);
    if (lk.acc === 'long') { if (dir === 'u') F(hair, 1, 2, 5, 4); else { F(hair, 0, 1, 1, 5); F(hair, 6, 1, 1, 5); } }
    if (lk.acc === 'bun') F(hair, 2, -1, 3, 1);
  }
  // 顔
  if (dir !== 'u') {
    const eyes = dir === 'd' ? [2, 4] : dir === 'l' ? [2] : [4];
    const ec = '#1a1a1a';
    for (const e of eyes) {
      if (ex === 'panic' || ex === 'shock' || ex === 'blank') F(ex === 'blank' ? '#333' : ec, e, 2, 1, 2);
      else if (ex === 'tired' || ex === 'happy') F('#4a3a30', e, 3, 1, 1);
      else F(ec, e, 3, 1, 1);
    }
    const mx = dir === 'd' ? 3 : dir === 'l' ? 2 : 4;
    if (ex === 'happy') F('#d9686a', mx, 4, 1, 1);
    else if (ex === 'shock') F('#5a2020', mx, 4, 1, 1);
    else if (ex === 'panic' || ex === 'angry') F('#5a2020', dir === 'd' ? 2 : mx, 4, dir === 'd' ? 3 : 1, 1);
    else if (ex === 'worry') F('#a86a5a', mx, 4, 1, 1);
    if (ex === 'worry' || ex === 'panic') { if (ex === 'panic' || (G.t % 1.2) < 0.7) { F('#8fd8ff', 6, 1, 1, 2); } }
    if (ex === 'happy' && p.kind === 'manager') { F('#f2a0a0', 1, 3, 1, 1); F('#f2a0a0', 5, 3, 1, 1); }
  }
  // 持ち運び中のポスター
  if (p.kind === 'manager' && mgr.carry) { F('#fbfaf3', 1, 4, 5, 6); F('#1d5fc0', 2, 5, 3, 3); }
  // 頭上アイコン
  if (p.kind === 'seeker' && G.phase !== 'title') {
    const iy = oy - 7 + bob;
    if (p.state === 'lured') glyph(g, '!', x, iy, p.rush ? '#ff5a4f' : '#ffd24a');
    else if (p.state === 'explore' || p.state === 'askWait') glyph(g, '?', x, iy, p.urg > 0.84 ? '#ff9a8a' : '#ffffff');
  }
}

/* =========================================================
 * 描画：ポスター（高解像度レイヤー、ワールド座標）
 * ======================================================= */
function posterRect(sl, k) {
  const pic = 9 * k, w = pic + 4, h = pic + 8, [nx, ny] = sl.n;
  if (ny === 1) return { x: sl.x - w / 2, y: sl.y - h, w, h };
  if (ny === -1) return { x: sl.x - w / 2, y: sl.y + 3 - h, w, h };
  if (nx === 1) return { x: sl.x - 1, y: sl.y - h + 4, w, h };
  return { x: sl.x + 1 - w, y: sl.y - h + 4, w, h };
}
function rr(g, x, y, w, h, r) {
  g.beginPath(); g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r);
  g.lineTo(x + w, y + h - r); g.quadraticCurveTo(x + w, y + h, x + w - r, y + h); g.lineTo(x + r, y + h);
  g.quadraticCurveTo(x, y + h, x, y + h - r); g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y); g.closePath();
}
function drawPicto(g, x, y, s) {
  const u = s / 80;
  g.fillStyle = '#1d5fc0'; rr(g, x, y, s, s, 9 * u); g.fill();
  g.fillStyle = '#fff';
  g.beginPath(); g.arc(x + 22 * u, y + 16 * u, 6 * u, 0, Math.PI * 2); g.fill();
  rr(g, x + 14 * u, y + 24 * u, 16 * u, 24 * u, 3 * u); g.fill();
  g.fillRect(x + 15 * u, y + 46 * u, 6 * u, 24 * u); g.fillRect(x + 23 * u, y + 46 * u, 6 * u, 24 * u);
  g.beginPath(); g.arc(x + 58 * u, y + 16 * u, 6 * u, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.moveTo(x + 51 * u, y + 24 * u); g.lineTo(x + 65 * u, y + 24 * u); g.lineTo(x + 71 * u, y + 52 * u); g.lineTo(x + 45 * u, y + 52 * u); g.closePath(); g.fill();
  g.fillRect(x + 52 * u, y + 50 * u, 4 * u, 20 * u); g.fillRect(x + 60 * u, y + 50 * u, 4 * u, 20 * u);
  g.globalAlpha = 0.55; g.fillRect(x + 39.3 * u, y + 8 * u, 1.4 * u, 64 * u); g.globalAlpha = 1;
}
function drawTape(g, p, px, py, s) {
  const cx = px + s / 2, cy = py + s / 2, L = s * 1.3, th = Math.max(1.4, s * 0.17);
  for (let i = 0; i < 2; i++) {
    const st = p.strips[i]; if (st.gone) continue;
    const prog = clamp(p.tapeShow * 2 - i, 0, 1); if (prog <= 0) continue;
    const ang = i === 0 ? Math.PI / 4 : -Math.PI / 4;
    g.save(); g.translate(cx, cy); g.rotate(ang);
    const flap = st.lift > 0 ? L * 0.38 * st.lift : 0;
    const len = (L - flap) * prog;
    g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(-L / 2 + 0.4, -th / 2 + 0.5, len, th);
    g.fillStyle = '#d7302b'; g.fillRect(-L / 2, -th / 2, len, th);
    g.fillStyle = '#f0675d'; g.fillRect(-L / 2, -th / 2, len, th * 0.22);
    g.fillStyle = '#d7302b';
    g.beginPath(); g.moveTo(-L / 2, -th / 2); g.lineTo(-L / 2 - th * 0.3, -th / 6); g.lineTo(-L / 2, th / 6); g.lineTo(-L / 2 - th * 0.3, th / 2); g.lineTo(-L / 2, th / 2); g.fill();
    if (flap > 0) {
      g.translate(L / 2 - flap, 0);
      g.rotate(-(0.5 + 0.45 * Math.sin(G.t * 13 + i * 2)) * st.lift * (i === 0 ? 1 : -1) - 0.2 * st.lift);
      g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(0.6, -th / 2 + 1.2, flap, th);
      g.fillStyle = '#f08a80'; g.fillRect(0, -th / 2, flap, th);
      g.fillStyle = '#d7302b'; g.fillRect(0, -th / 2, flap, th * 0.25);
    }
    g.restore();
  }
}
function drawPoster(g, p) {
  const sl = SLOTS[p.slot], k = Math.max(0.2, p.scaleShow), r = posterRect(sl, k);
  g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(r.x + 0.8, r.y + 0.9, r.w, r.h);
  g.fillStyle = '#fbfaf3'; g.fillRect(r.x, r.y, r.w, r.h);
  g.strokeStyle = '#b5b0a0'; g.lineWidth = 0.35; g.strokeRect(r.x, r.y, r.w, r.h);
  g.fillStyle = 'rgba(230,220,170,.85)'; g.fillRect(r.x - 0.8, r.y - 0.6, 3, 1.4); g.fillRect(r.x + r.w - 2.2, r.y - 0.6, 3, 1.4);
  const pic = 9 * k, px = r.x + 2, py = r.y + 2;
  drawPicto(g, px, py, pic);
  const fs = 1.62 * (1 + 0.05 * (k - 1));
  g.fillStyle = '#333'; g.font = `${fs}px ${SANS}`; g.textAlign = 'center'; g.textBaseline = 'middle';
  const ty = py + pic + (r.h - pic - 2) / 2;
  g.fillText('ここにトイレは', r.x + r.w / 2, ty - fs * 0.56);
  g.fillText('ありません', r.x + r.w / 2, ty + fs * 0.6);
  if (p.taped || p.strips.some(s => s.lift > 0)) drawTape(g, p, px, py, pic);
}

/* 看板の文字 */
const LABELS = [
  { x: 61, y: 169.6, t: '西口改札', s: 4, c: '#fff' }, { x: 261, y: 169.6, t: '南口改札', s: 4, c: '#fff' },
  { x: 136, y: 73.6, t: '1・2番線', s: 4, c: '#fff' }, { x: 432, y: 93.6, t: '東口 ↑', s: 4, c: '#222' },
  { x: 321, y: 15.6, t: '駅務室', s: 2.8, c: '#24345e' }, { x: 146, y: 211.6, t: 'そよかぜ駅', s: 5, c: '#fff' },
  { x: 392, y: 205, t: '準備中', s: 2.8, c: '#333' }, { x: 20, y: 136, t: '工事中', s: 3.2, c: '#f2c230', rot: true },
  { x: 467, y: 22.5, t: 'トイレ→東口', s: 2.2, c: '#ddd' },
];
function drawLabels(g) {
  g.textAlign = 'center'; g.textBaseline = 'middle';
  for (const l of LABELS) {
    g.font = `${l.s}px ${FONT}`; g.fillStyle = l.c;
    if (l.rot) { g.save(); g.translate(l.x, l.y); g.rotate(-Math.PI / 2); g.globalAlpha = 0.55; g.fillText(l.t, 0, 0); g.restore(); }
    else g.fillText(l.t, l.x, l.y);
  }
}

/* =========================================================
 * 描画：全体
 * ======================================================= */
function render() {
  ctx.setTransform(pxr, 0, 0, pxr, 0, 0);
  ctx.fillStyle = '#05070c'; ctx.fillRect(0, 0, LW, LH);
  const z = cam.zoom * 2, ox = LW / 2 - cam.x * z + cam.sx, oy = LH / 2 - cam.y * z + cam.sy;
  ctx.setTransform(pxr * z, 0, 0, pxr * z, pxr * ox, pxr * oy);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(bg, 0, 0);
  drawLabels(ctx);
  drawZones(ctx);
  for (const p of posters) if (p.slot !== null) drawPoster(ctx, p);
  drawSlotMarks(ctx);
  // 人物
  cg.clearRect(0, 0, WW, WH);
  const list = people.slice(); if (G.mode !== 'title') list.push(mgr);
  list.sort((a, b) => a.y - b.y);
  for (const p of list) drawPerson(cg, p);
  ctx.drawImage(chars, 0, 0);
  drawParticles(ctx);
  // 画面座標
  ctx.setTransform(pxr, 0, 0, pxr, 0, 0);
  drawBadges();
  drawBubbles();
  drawFloaters();
  if (G.fade > 0) { ctx.fillStyle = `rgba(0,0,0,${G.fade})`; ctx.fillRect(0, 0, LW, LH); }
}
function drawZones(g) {
  const show = [];
  if (G.mode === 'play' && G.phase !== 'end' && !G.toolsLocked) {
    const hs = G.hover ? hitSlot(G.hover.x, G.hover.y) : -1;
    if (hs >= 0 && G.tool) { const po = SLOTS[hs].poster; show.push({ slot: hs, k: po ? po.scale : 1, taped: po && po.taped, a: 0.22 }); }
    if (G.selected && G.selected.slot !== null) show.push({ slot: G.selected.slot, k: G.selected.scale, taped: G.selected.taped, a: 0.22 });
  }
  if (G.zoneFlash && G.phase !== 'end') { const f = G.zoneFlash; const po = SLOTS[f.slot].poster; show.push({ slot: f.slot, k: f.k, taped: po && po.taped, a: 0.26 * (1 - ease((f.t - 1.6) / 1)) }); }
  for (const z of show) {
    const tiles = zoneTiles(z.slot, z.k);
    g.fillStyle = z.taped ? `rgba(230,60,60,${z.a})` : `rgba(40,130,255,${z.a})`;
    for (let i = 0; i < tiles.length; i += 2) g.fillRect(tiles[i] * TS, tiles[i + 1] * TS, TS, TS);
  }
}
function drawSlotMarks(g) {
  if (G.mode !== 'play' || G.toolsLocked || G.phase === 'end') return;
  const tool = G.tool; if (!tool) return;
  const blink = 0.55 + 0.45 * Math.sin(G.t * 5);
  g.lineWidth = 0.6;
  for (const sl of SLOTS) {
    const po = sl.poster;
    if (!po) {
      if (sl.reserved) {
        const r = posterRect(sl, 1);
        g.setLineDash([1.2, 0.9]); g.strokeStyle = '#ffd24a'; g.strokeRect(r.x, r.y, r.w, r.h); g.setLineDash([]);
        g.fillStyle = 'rgba(255,210,74,.25)'; g.fillRect(r.x, r.y, r.w, r.h);
      } else if (tool === 'place' || (tool === 'move' && G.selected)) {
        const r = posterRect(sl, 1);
        g.setLineDash([1.4, 1]); g.strokeStyle = `rgba(255,255,255,${blink})`; g.strokeRect(r.x, r.y, r.w, r.h); g.setLineDash([]);
        g.fillStyle = `rgba(255,255,255,${0.12 * blink})`; g.fillRect(r.x, r.y, r.w, r.h);
      }
    } else if (po.slot !== null && tool !== 'place') {
      const r = posterRect(sl, po.scale);
      const sel = G.selected === po;
      if (tool === 'tape' && po.taped) continue;
      g.strokeStyle = sel ? '#ffd24a' : `rgba(255,210,74,${0.35 + 0.4 * blink})`;
      g.lineWidth = sel ? 1.2 : 0.6;
      g.strokeRect(r.x - 1, r.y - 1, r.w + 2, r.h + 2);
    }
  }
  g.lineWidth = 1;
}
function drawBadges() {
  if (G.phase === 'end' || G.mode !== 'play') return;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const p of posters) {
    if (p.slot === null) continue;
    const r = posterRect(SLOTS[p.slot], p.scale);
    if (p.fooled > 0) {
      const s = w2s(r.x + r.w, r.y);
      ctx.fillStyle = '#e8403a'; ctx.beginPath(); ctx.arc(s.x, s.y, 7.5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.font = `bold 9px ${SANS}`; ctx.fillText(p.fooled > 99 ? '99' : String(p.fooled), s.x, s.y + 0.5);
    }
    if (p.pend > 0) {
      const s = w2s(r.x, r.y);
      ctx.fillStyle = '#ffd24a'; ctx.beginPath(); ctx.arc(s.x, s.y, 6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#2a2210'; ctx.font = `bold 8px ${SANS}`; ctx.fillText('…', s.x, s.y - 1);
    }
  }
}
function drawBubbles() {
  const list = [];
  if (mgr.bubble && G.mode !== 'title') list.push(mgr);
  for (const p of people) if (p.bubble) list.push(p);
  const placed = [], draws = [];
  for (const p of list) {
    const b = p.bubble;
    const big = b.kind === 'big';
    const fs = big ? 30 : b.kind === 'shout' ? 13 : 12;
    ctx.font = `${fs}px ${FONT}`;
    const tw = ctx.measureText(b.text).width;
    const w = tw + (big ? 26 : 12), h = fs + (big ? 18 : 9);
    const head = w2s(p.x, p.y - (p.small ? 11 : 14));
    const pw = w + (b.kind === 'shout' || big ? 16 : 8), ph = h + (b.kind === 'shout' || big ? 12 : 2);
    let bx = clamp(head.x - w / 2, 4, LW - w - 4), by = head.y - h - 7;
    const mx = (pw - w) / 2, my = (ph - h) / 2;
    const hit = y => placed.find(q => bx - mx < q.x + q.w && bx - mx + pw > q.x && y - my < q.y + q.h && y - my + ph > q.y);
    let q, guard = 0;
    while ((q = hit(by)) && guard++ < 12) by = q.y - ph + my - 1;
    if (by < 36) {   // 上に逃げきれなければ下へ
      by = head.y - h - 7; guard = 0;
      while ((q = hit(by)) && guard++ < 12) by = q.y + q.h + my + 1;
      by = clamp(by, 36, LH - 70);
    }
    placed.push({ x: bx - mx, y: by - my, w: pw, h: ph });
    draws.push({ b, big, fs, w, h, bx, by, head, tail: Math.abs(by + h + 7 - head.y) < 30 || p === mgr });
  }
  for (let i = draws.length - 1; i >= 0; i--) {
    const { b, big, fs, w, h, bx, by, head, tail } = draws[i];
    ctx.font = `${fs}px ${FONT}`;
    const sc = b.t < 0.12 ? 0.6 + 0.4 * (b.t / 0.12) : 1;
    const al = b.dur - b.t < 0.25 ? Math.max(0, (b.dur - b.t) / 0.25) : 1;
    ctx.save(); ctx.globalAlpha = al;
    ctx.translate(bx + w / 2, by + h / 2); ctx.scale(sc, sc); ctx.translate(-(bx + w / 2), -(by + h / 2));
    let fill = '#fff', stroke = '#2a2a3a', tc = '#1c1c28';
    if (b.kind === 'shout') { fill = '#fff6d8'; stroke = '#c0392b'; }
    if (b.kind === 'think') { fill = '#eef2ff'; stroke = '#7d8ab8'; tc = '#38406a'; }
    if (big) { fill = '#fff'; stroke = '#c0392b'; tc = '#c0392b'; }
    // しっぽ
    ctx.fillStyle = fill; ctx.strokeStyle = stroke; ctx.lineWidth = big ? 3 : 1.5;
    if (!tail) { /* 押し出された吹き出しはしっぽ無し */ }
    else if (b.kind === 'think') {
      ctx.beginPath(); ctx.arc(head.x, by + h + 4, 2.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(head.x - 2, by + h + 9, 1.6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    } else {
      const tx = clamp(head.x, bx + 6, bx + w - 6);
      ctx.beginPath(); ctx.moveTo(tx - 4, by + h - 1); ctx.lineTo(head.x, Math.min(head.y - 1, by + h + 7)); ctx.lineTo(tx + 4, by + h - 1); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    if (b.kind === 'shout' || big) {
      // ぎざぎざ吹き出し
      ctx.beginPath();
      const n = Math.max(10, Math.floor(w / 9)), cx = bx + w / 2, cy = by + h / 2;
      for (let j = 0; j <= n * 2; j++) {
        const a = j / (n * 2) * Math.PI * 2, rr2 = j % 2 ? 1 : 1.13;
        ctx.lineTo(cx + Math.cos(a) * (w * 0.53 + 6) * rr2, cy + Math.sin(a) * (h / 2 + 6) * rr2);
      }
      ctx.closePath(); ctx.fill(); ctx.stroke();
    } else {
      rr(ctx, bx, by, w, h, 6); ctx.fill();
      if (b.kind === 'think') ctx.setLineDash([3, 2]);
      ctx.stroke(); ctx.setLineDash([]);
    }
    ctx.fillStyle = tc; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(b.text, bx + w / 2, by + h / 2 + 1);
    ctx.restore();
  }
}
function drawFloaters() {
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const f of floaters) {
    const s = f.screen ? { x: f.x, y: f.y } : w2s(f.x, f.y);
    const a = f.t < 0.15 ? f.t / 0.15 : f.t > f.dur - 0.4 ? Math.max(0, (f.dur - f.t) / 0.4) : 1;
    ctx.globalAlpha = a;
    ctx.font = `${f.size}px ${FONT}`;
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(10,12,20,.85)'; ctx.strokeText(f.text, s.x, s.y);
    ctx.fillStyle = f.color; ctx.fillText(f.text, s.x, s.y);
    ctx.globalAlpha = 1;
  }
}
function drawParticles(g) {
  for (const p of particles) {
    const a = 1 - p.t / p.dur;
    if (p.type === 'sweat') { g.fillStyle = `rgba(140,215,255,${a})`; g.fillRect(p.x, p.y, 1, 1.6); }
    else if (p.type === 'steam') { g.fillStyle = `rgba(255,255,255,${a * 0.8})`; g.beginPath(); g.arc(p.x, p.y, 1 + p.t * 2.5, 0, Math.PI * 2); g.fill(); }
    else if (p.type === 'paper') { g.fillStyle = `rgba(250,250,240,${a})`; g.fillRect(p.x, p.y, 2, 1.5); }
    else if (p.type === 'wind') { g.strokeStyle = `rgba(255,255,255,${0.35 * Math.min(1, a * 2)})`; g.lineWidth = 0.6; g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x - p.len, p.y - p.vy * 0.05); g.stroke(); }
    else if (p.type === 'leaf') { g.fillStyle = `rgba(150,190,90,${a})`; g.fillRect(p.x, p.y, 1.5, 1); }
    else if (p.type === 'strip') {
      g.save(); g.translate(p.x, p.y); g.rotate(p.rot); g.globalAlpha = Math.min(1, a * 2);
      g.fillStyle = '#d7302b'; g.fillRect(-p.len / 2, -p.th / 2, p.len, p.th);
      g.fillStyle = '#f0675d'; g.fillRect(-p.len / 2, -p.th / 2, p.len, p.th * 0.25);
      g.restore();
    }
  }
}

/* =========================================================
 * 入力
 * ======================================================= */
function hitSlot(wx, wy) {
  let best = -1, bd = Infinity;
  for (const sl of SLOTS) {
    const po = sl.poster, r = posterRect(sl, po ? po.scale : 1), pad = 8;
    if (wx >= r.x - pad && wx <= r.x + r.w + pad && wy >= r.y - pad && wy <= r.y + r.h + pad) {
      const d = hyp(wx - (r.x + r.w / 2), wy - (r.y + r.h / 2));
      if (d < bd) { bd = d; best = sl.id; }
    }
  }
  return best;
}
function effectiveCount() {
  let n = posters.length;
  for (const t of mgr.queue) { if (t.type === 'place') n++; if (t.type === 'remove') n--; }
  return n;
}
function onTap(wx, wy) {
  if (G.mode !== 'play' || G.toolsLocked || G.phase === 'end') return;
  const tool = G.tool; if (!tool || !G.unlocked[tool]) return;
  const si = hitSlot(wx, wy);
  if (si < 0) { if (G.selected) { G.selected = null; } return; }
  const sl = SLOTS[si], p = sl.poster;
  switch (tool) {
    case 'place':
      if (p || sl.reserved) { toast(p ? 'ここにはもう貼ってある' : 'いま貼りに行くところ'); AU.ng(); return; }
      if (posters.length + mgr.queue.filter(t => t.type === 'place').length >= G.maxPosters) {
        toast(G.maxPosters === 1 ? 'まずは1枚だけ。ほかの場所に動かすなら「移動」' : 'これ以上は貼れない（最大' + G.maxPosters + '枚）'); AU.ng(); return;
      }
      sl.reserved = true; queueTask({ type: 'place', slot: si }); AU.select();
      break;
    case 'move':
      if (p) {
        if (p.pend) { toast('作業待ちのポスター'); AU.ng(); return; }
        G.selected = G.selected === p ? null : p; AU.select();
        if (G.selected) hint('貼りなおしたい壁の点線の枠をタップ');
        return;
      }
      if (!G.selected) { toast('先に、動かすポスターをタップ'); AU.ng(); return; }
      if (sl.reserved) { toast('いま貼りに行くところ'); AU.ng(); return; }
      sl.reserved = true; G.selected.pend++; queueTask({ type: 'move', poster: G.selected, to: si });
      G.selected = null; AU.select(); hint('');
      break;
    case 'remove':
      if (!p) { toast('はがすポスターをタップ'); AU.ng(); return; }
      if (p.pend) { toast('作業待ちのポスター'); AU.ng(); return; }
      if (effectiveCount() <= 1) { toast('1枚は残しておきたい……'); AU.ng(); return; }
      p.pend++; queueTask({ type: 'remove', poster: p }); AU.select();
      break;
    case 'scale':
      if (!p) { toast('大きくするポスターをタップ'); AU.ng(); return; }
      if (mgr.queue.some(t => t.type === 'remove' && t.poster === p)) return;
      p.pend++; queueTask({ type: 'scale', poster: p }); AU.select();
      break;
    case 'tape':
      if (!p) { toast('バツをつけるポスターをタップ'); AU.ng(); return; }
      if (p.taped || mgr.queue.some(t => t.type === 'tape' && t.poster === p)) { toast('もうバツがついている'); AU.ng(); return; }
      p.pend++; queueTask({ type: 'tape', poster: p }); AU.select();
      break;
  }
  updatePosterCount();
}
cv.addEventListener('pointerdown', e => {
  AU.init();
  const w = toWorld(e.clientX, e.clientY);
  if (e.pointerType !== 'mouse') G.hover = null;
  onTap(w.x, w.y);
});
cv.addEventListener('pointermove', e => { if (e.pointerType === 'mouse') G.hover = toWorld(e.clientX, e.clientY); });
cv.addEventListener('pointerleave', () => { G.hover = null; });

/* =========================================================
 * UI（DOM）
 * ======================================================= */
const el = {
  topbar: $('topbar'), phase: $('phase'), mute: $('mute'), vol: $('vol'), msg: $('msg'), msgWho: $('msg-who'), msgText: $('msg-text'),
  toast: $('toast'), hint: $('hint'), toolbar: $('toolbar'), pcN: $('pc-n'), pcMax: $('pc-max'),
  arr: $('st-arr'), fool: $('st-fool'), ask: $('st-ask'), mCrowd: $('m-crowd'), mUrg: $('m-urg'),
  card: $('card'), title: $('title'), ending: $('ending'), eStats: $('e-stats'),
};
const toolBtns = [...document.querySelectorAll('.tool')];
toolBtns.forEach(b => b.addEventListener('click', () => {
  AU.init();
  const t = b.dataset.tool;
  if (!G.unlocked[t]) { toast('まだ使えない'); AU.ng(); return; }
  b.classList.remove('new');
  setTool(t); AU.select();
}));
function setTool(t) {
  G.tool = t; G.selected = null;
  toolBtns.forEach(b => b.classList.toggle('on', b.dataset.tool === t));
}
function unlock(t) {
  G.unlocked[t] = true;
  const b = toolBtns.find(x => x.dataset.tool === t);
  if (b) { b.classList.remove('locked'); b.classList.add('new'); }
}
function lockTools(v) { G.toolsLocked = v; el.toolbar.classList.toggle('disabled', v); if (v) G.selected = null; }
let msgTimer = 0;
function showMsg(who, text, dur, kind) {
  el.msgWho.textContent = who; el.msgText.textContent = text;
  el.msg.className = kind || ''; void el.msg.offsetWidth; el.msg.classList.add('pop');
  clearTimeout(msgTimer); msgTimer = setTimeout(() => el.msg.classList.add('hide'), (dur / G.speed) * 1000 + 400);
}
let toastTimer = 0;
function toast(text) {
  el.toast.textContent = text; el.toast.classList.remove('hide');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.toast.classList.add('hide'), 2000);
}
function hint(text) { el.hint.textContent = text; el.hint.classList.toggle('hide', !text); }
function setPhase(id, label) { G.phase = id; el.phase.textContent = label; }
function updatePosterCount() { el.pcN.textContent = posters.length; el.pcMax.textContent = G.maxPosters; }
function bumpChip(id) {
  const c = $(id).parentElement; c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump');
}
let hudAcc = 0;
function hudTick(dt) {
  hudAcc += dt; if (hudAcc < 0.25) return; hudAcc = 0;
  let n = 0, u = 0;
  for (const p of people) if (p.kind === 'seeker') { n++; u += p.urg; }
  el.arr.textContent = S.arrived; el.fool.textContent = S.fooled; el.ask.textContent = S.asks;
  const crowd = clamp(n / 30, 0, 1), urg = n ? u / n : 0;
  el.mCrowd.style.width = (crowd * 100) + '%'; el.mUrg.style.width = (urg * 100) + '%';
  AU.intensity = G.phase === 'peace' ? 0 : clamp(crowd * 0.8 + urg * 0.35 - 0.1, 0, 1);
}
el.mute.addEventListener('click', () => { AU.init(); AU.muted = !AU.muted; el.mute.classList.toggle('off', AU.muted); AU.apply(); });
el.vol.addEventListener('input', () => { AU.init(); AU.vol = el.vol.value / 100; if (AU.muted && AU.vol > 0) { AU.muted = false; el.mute.classList.remove('off'); } AU.apply(); });
['pointerdown', 'touchstart'].forEach(ev => el.topbar.addEventListener(ev, e => e.stopPropagation()));

let cardResolve = null;
function showCard() {
  el.card.classList.remove('hide');
  return new Promise(r => { cardResolve = r; });
}
el.card.addEventListener('click', () => { el.card.classList.add('hide'); if (cardResolve) { const r = cardResolve; cardResolve = null; r(); } });

/* =========================================================
 * ストーリー
 * ======================================================= */
async function think(text, dur) {
  say(mgr, text, { pri: 3, kind: 'think', dur });
  showMsg('管理人（心の声）', text, dur, 'think');
  await sleep(dur);
}
async function mgrSay(text, dur, kind) {
  say(mgr, text, { pri: 3, kind: kind || 'say', dur });
  showMsg('管理人', text, dur);
  await sleep(dur);
}
function allTaped() { return posters.length > 0 && posters.every(p => p.taped && p.slot !== null) && !mgr.queue.some(t => t.type === 'place' || t.type === 'move'); }

async function story() {
  /* ---- 導入 ---- */
  setPhase('intro', 'プロローグ');
  G.spawnMode = 'intro';
  mgr.baseExpr = 'tired';
  AU.chime();
  await sleep(1.6);
  for (let i = 0; i < 3; i++) {
    spawnSeeker({ from: ['E_S', 'E_W', 'E_S'][i], script: 'toManager', urg: 0.32 + i * 0.12, knows: false, type: ['salary', 'ol', 'student'][i] });
    await sleep(i === 0 ? 5 : 3.5);
  }
  await until(() => S.asks >= 3, 45);
  await sleep(1.2);
  mgr.baseExpr = 'tired';
  await think('毎日毎日、同じこと聞かれるな……', 3.2);
  await sleep(0.5);
  mgr.baseExpr = 'normal'; mgr.expr = 'shock'; mgr.exprT = 1.2;
  floater(mgr.x, mgr.y - 18, '！', { color: '#ffd24a', size: 18, vy: -6 });
  await think('そうだ。ポスターを貼ればいいんだ！', 2.8);
  AU.unlock();
  await Promise.race([showCard(), sleep(9)]);
  el.card.classList.add('hide'); cardResolve = null;

  /* ---- 第1段階 ---- */
  setPhase('p1', '第1段階　ポスター設置');
  el.toolbar.classList.remove('hide');
  unlock('place'); setTool('place'); G.maxPosters = 1; updatePosterCount();
  hint('壁の点線の枠をタップして、ポスターを貼ろう');
  G.spawnMode = 'p1';
  await until(() => posters.length > 0);
  hint('');
  await sleep(0.9);
  mgr.baseExpr = 'happy';
  await mgrSay('よし、これで間違ってくる人も減るだろう', 2.8);
  mgr.baseExpr = 'normal';
  hint('青い範囲から、ポスターのマークが見えるようだ');
  setTimeout(() => { if (el.hint.textContent.startsWith('青い')) hint(''); }, 5000 / G.speed);
  const t1 = G.t, f1 = S.fooled;
  await until(() => S.fooled - f1 >= 3 || G.t - t1 > 26);
  await sleep(0.6);
  mgr.baseExpr = 'blank';
  await mgrSay('……なんで？', 2.6);
  mgr.baseExpr = 'normal';
  unlock('move'); AU.unlock();
  toast('「移動」が使えるようになった');
  hint('「移動」→ ポスターをタップ → 別の枠をタップで貼りなおせる');
  setTimeout(() => { if (el.hint.textContent.startsWith('「移動」')) hint(''); }, 9000 / G.speed);
  await sleep(24);

  /* ---- 第2段階 ---- */
  setPhase('p2', '第2段階　案内強化');
  await until(() => mgr.state === 'idle' || mgr.state === 'home', 8);
  await think('ポスターが目立ってないのかな……', 2.6);
  await think('もっと貼ればいいのか？', 2.2);
  await think('もっと大きくした方がいい？', 2.4);
  G.maxPosters = 6; updatePosterCount();
  unlock('scale'); unlock('remove'); AU.unlock();
  toast('ポスターの追加・巨大化・はがすが使えるようになった');
  hint('枚数・場所・大きさを工夫して、客をうまく案内しよう（最大6枚）');
  setTimeout(() => { if (el.hint.textContent.startsWith('枚数')) hint(''); }, 9000 / G.speed);
  G.spawnMode = 'p2';
  const t2 = G.t, f2 = S.fooled;
  await until(() => (G.t - t2 > 62 && S.fooled - f2 >= 14) || G.t - t2 > 105);

  /* ---- 第3段階 ---- */
  setPhase('p3', '第3段階　真相に気づく');
  lockTools(true); hint(''); G.bubbleCap = 4;
  G.spawnMode = 'pause';
  await until(() => mgr.queue.length === 0 && mgr.state === 'idle' && mgrAtHome(), 30);
  G.mgrHold = true;
  await until(() => mgr.state !== 'talk', 8);
  let angry = null, bd = Infinity;
  for (const p of people) {
    if (p.kind !== 'seeker' || p.fooledN < 1 || p.inConv || p.state === 'leave') continue;
    const d = hyp(p.x - mgr.x, p.y - mgr.y); if (d < bd) { bd = d; angry = p; }
  }
  if (!angry || bd > 260) { angry = spawnSeeker({ from: 'E_S', type: 'salary', urg: 0.8, knows: false }); angry.fooledN = 2; }
  const ai = askQ.indexOf(angry); if (ai >= 0) askQ.splice(ai, 1);
  angry.lure = null; angry.state = 'script'; angry.asked = true; angry.expr = 'angry'; angry.exprT = 99;
  routeTo(angry, 'D_M', { x: mgr.home.x + 6, y: mgr.home.y + 13, node: null, anch: ['D_M'] });
  say(angry, 'ちょっと！ 駅員さん！', { pri: 3, kind: 'shout', dur: 2 });
  await until(() => angry.dead || !angry.path.length, 30);
  angry.dir = 'u'; mgr.dir = 'd'; mgr.state = 'talk';
  AU.angry(); cam.shake = 1.2; cam.decay = 2;
  say(angry, 'どう見てもトイレがあるような表示だろ！', { pri: 3, kind: 'shout', dur: 2.8 });
  showMsg('怒った客', 'どう見てもトイレがあるような表示だろ！', 2.8, 'angry');
  for (let i = 0; i < 4; i++) particle({ type: 'steam', x: angry.x + rand(-3, 3), y: angry.y - 13, vx: rand(-6, 6), vy: rand(-14, -8), dur: 0.9 });
  await sleep(2.9);
  AU.angry(); cam.shake = 1.5; cam.decay = 2;
  say(angry, 'わざとやってんのか！', { pri: 3, kind: 'shout', dur: 2.3 });
  showMsg('怒った客', 'わざとやってんのか！', 2.3, 'angry');
  await sleep(2.4);
  mgr.baseExpr = 'worry';
  await mgrSay('す、すみません……トイレは東口の方に……', 2.4);
  angry.exprT = 0; angry.knows = true; angry.state = 'toToilet'; routeTo(angry, 'T');
  say(angry, '最初からそう書いてくれ！', { pri: 2, kind: 'shout', dur: 1.8 });
  mgr.state = 'idle';
  await sleep(1.8);
  mgr.baseExpr = 'blank';
  await think('……そうか', 2.2);
  mgr.baseExpr = 'normal';
  await think('マークだけ目立って、トイレがあるように見えるんだ', 3.4);
  await think('だったら……', 2.2);
  G.mgrHold = false;

  /* ---- 第4段階 ---- */
  setPhase('p4', '第4段階　平和へ'); G.bubbleCap = 8;
  unlock('tape'); AU.unlock(); lockTools(false); setTool('tape');
  toast('「赤テープ」が使えるようになった');
  hint('ポスターをタップして、トイレマークに赤いテープでバツをつけよう');
  G.spawnMode = 'p4';
  const t4 = G.t;
  await until(() => allTaped() || G.t - t4 > 80);
  if (!allTaped()) {
    lockTools(true);
    await mgrSay('全部にバツをつけておこう', 2);
    await until(() => mgr.queue.length === 0, 20);
    for (const p of posters) if (!p.taped && p.slot !== null) { p.pend++; queueTask({ type: 'tape', poster: p }); }
    await until(() => allTaped(), 40);
    lockTools(false);
  }
  hint('バツの位置も工夫できる。客が迷わなくなるまで様子を見よう');
  S.lastFoolT = Math.max(S.lastFoolT, G.t - 3);
  await until(() => allTaped() && G.t - S.lastFoolT > 9 && G.t - S.lastTapeT > 6 && mgr.queue.length === 0, 60);

  /* ---- 平和 ---- */
  lockTools(true); hint('');
  setPhase('peace', '平和');
  G.spawnMode = 'peace'; AU.setMusic('peace');
  await until(() => mgr.state === 'idle' && mgrAtHome(), 15);
  G.mgrHold = true;
  await sleep(1.5);
  mgr.baseExpr = 'happy';
  await think('よかった……', 2.6);
  await sleep(0.8);
  await think('これでやっと落ち着いた……', 3.2);
  for (let i = 0; i < 3; i++) { await sleep(2.2); const s = people.find(p => p.kind === 'seeker' && !p.bubble); if (s) say(s, pick(['なるほど、東口ね', 'わかりやすい！', 'バツか。じゃあ東口だな']), { pri: 1 }); }
  await sleep(2.5);
  say(mgr, 'ふう……', { pri: 3, kind: 'think', dur: 2 });
  await sleep(2.2);

  await ending();
}

async function ending() {
  setPhase('end', '');
  G.spawnMode = 'none'; G.mgrHold = true;
  el.toolbar.classList.add('fade'); el.topbar.classList.add('hide'); hint('');
  await sleep(1.8);
  // 風
  G.wind = 1; AU.setWind(true); AU.setMusic('none');
  G.quiet = true; people.forEach(p => { p.bubble = null; });
  for (let i = 0; i < 12; i++) particle({ type: 'leaf', x: rand(-40, 0), y: rand(30, 230), vx: rand(70, 120), vy: rand(-8, 8), dur: 5 });
  await sleep(2.6);
  const shown = posters.filter(p => p.slot !== null);
  // 1本目
  const lift = async (i, label) => {
    const t0 = G.t;
    shown.forEach((p, j) => { if (j < 5) { const r = posterRect(SLOTS[p.slot], p.scale); floater(r.x + r.w + 4, r.y + 2, label, { color: '#ffffff', size: 13, vy: -3, dur: 2.6 }); } });
    while (G.t - t0 < 2.6) { const k = ease((G.t - t0) / 2.6); shown.forEach(p => { p.strips[i].lift = k; }); await sleep(0.03); }
  };
  const fall = i => {
    shown.forEach(p => {
      const st = p.strips[i]; if (st.gone) return;
      st.gone = true; st.lift = 0;
      const r = posterRect(SLOTS[p.slot], p.scale), pic = 9 * p.scale;
      particle({ type: 'strip', x: r.x + 2 + pic / 2, y: r.y + 2 + pic / 2, vx: 6, vy: -4, rot: i === 0 ? Math.PI / 4 : -Math.PI / 4, vr: rand(2, 4) * (i ? -1 : 1), len: pic * 1.3, th: Math.max(1.4, pic * 0.17), dur: 3.5 });
    });
    AU.peel();
  };
  await lift(0, 'ペラ……');
  fall(0);
  await sleep(1.8);
  await lift(1, 'ペラリ……');
  fall(1);
  shown.forEach(p => { p.taped = false; p.tapeShow = 0; });
  await sleep(1.4);
  G.wind = 0; AU.setWind(false);
  await sleep(2.4);   // 静寂
  // 遠くから
  const voices = [['あっ！ トイレだ！', 60, 236], ['こっちこっち！', 260, 236], ['急げえええ！', 136, 22], ['もれるううう！', 470, 52]];
  for (const [t, x, y] of voices) {
    const s = w2s(x, y);
    floater(clamp(s.x, 90, LW - 90), clamp(s.y, 50, 410), t, { color: '#fff3c0', size: 17, vy: -4, dur: 2.4, screen: true });
    AU.blip(1);
    await sleep(0.55);
  }
  // 大量来客
  G.quiet = false; G.bubbleCap = 11;
  let lure = 0;
  shown.forEach(p => { lure += Math.pow(p.scale, 1.5) * 15 + gateSee(p.slot, p.scale) * 4; });
  const crowd = Math.round(clamp(16 + lure + shown.length * 3, 24, 150));
  S.rush = crowd;
  AU.setRumble(true); AU.setMusic('main'); AU.intensity = 1;
  cam.shake = 0.6; cam.decay = 0;
  const ents = ['E_W', 'E_S', 'E_ST', 'E_ST', 'T'];
  const weights = shown.map(p => p.scale * p.scale + 0.5);
  const wsum = weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < crowd; i++) {
    const p = spawnSeeker({ from: pick(ents), urg: 1, knows: false });
    p.rush = true; p.speedMul *= rand(0.9, 1.15);
    let r = Math.random() * wsum, target = shown[0];
    for (let j = 0; j < shown.length; j++) { r -= weights[j]; if (r <= 0) { target = shown[j]; break; } }
    startLure(p, target, true);
    if (Math.random() < 0.35) say(p, line('rush'), { pri: 1, kind: 'shout' });
    if (i % 6 === 5) { cam.shake = Math.min(2.4, cam.shake + 0.12); await sleep(4.2 / (crowd / 6)); }
  }
  await sleep(3.2);
  mgr.dir = 'd'; mgr.baseExpr = 'shock'; mgr.expr = 'shock'; mgr.exprT = 0;
  G.quiet = true; people.forEach(p => { p.bubble = null; });
  cam.anim = { t: 0, dur: 1.4, fx: cam.x, fy: cam.y, fz: cam.zoom, tx: mgr.x, ty: mgr.y - 12, tz: 2.4 };
  say(mgr, '…………', { pri: 3, dur: 2.6 });
  await sleep(2.8);
  cam.shake = 3.5; cam.decay = 1.5;
  mgr.jump = 0;
  say(mgr, 'なんでええええええ！？', { pri: 3, kind: 'big', dur: 3 });
  AU.scream();
  for (let i = 0; i < 10; i++) { mgr.jump = i % 2 ? 0 : 2; await sleep(0.08); }
  mgr.jump = 0;
  await sleep(1.6);
  // 暗転
  const f0 = G.t;
  while (G.t - f0 < 1.2) { G.fade = ease((G.t - f0) / 1.2); await sleep(0.03); }
  G.fade = 1;
  AU.setRumble(false); AU.setMusic('none');
  await sleep(0.6);
  showEnding();
}

function showEnding() {
  G.mode = 'over';
  const maxS = posters.reduce((m, p) => Math.max(m, p.scale), 1);
  el.eStats.innerHTML =
    `貼ったポスター<b>${posters.length}</b>枚（いちばん大きいもの ×<b>${maxS}</b>）<br>` +
    `トイレにたどり着いた人<b>${S.rushArrived}</b>人<br>` +
    `誤誘導<b>${S.foolBeforeEnd}</b>人　／　問い合わせ<b>${S.asks}</b>回<br>` +
    `最後に押し寄せた人<b>${S.rush}</b>人`;
  el.ending.classList.remove('hide', 's1', 's2');
  setTimeout(() => el.ending.classList.add('s1'), 400);
  setTimeout(() => el.ending.classList.add('s2'), 3400);
  AU.chime();
}

/* =========================================================
 * 開始・リセット
 * ======================================================= */
function resetWorld() {
  RUN++;
  timers.length = 0; waiters.length = 0;
  people = []; posters = []; particles = []; floaters = []; askQ = [];
  SLOTS.forEach(s => { s.poster = null; s.reserved = false; });
  S = { fooled: 0, asks: 0, arrived: 0, gaveUp: 0, converted: 0, placed: 0, xSeen: 0, lastFoolT: 0, lastTapeT: 0, maxScale: 1, rush: 0, rushArrived: 0, foolBeforeEnd: 0, saidGrow: false };
  Object.assign(G, { t: 0, tool: null, unlocked: {}, maxPosters: 0, toolsLocked: false, mgrHold: false, selected: null, fade: 0, wind: 0, seekAcc: 0, comAcc: 0, zoneFlash: null, bubbleCap: 8, quiet: false });
  Object.assign(cam, { x: WW / 2, y: 135, zoom: 1, sx: 0, sy: 0, shake: 0, anim: null, decay: 0 });
  resetManager();
  toolBtns.forEach(b => { b.classList.add('locked'); b.classList.remove('on', 'new'); });
  lockTools(false);
  el.toolbar.classList.add('hide'); el.toolbar.classList.remove('fade');
  el.msg.classList.add('hide'); el.toast.classList.add('hide'); hint('');
  el.ending.classList.add('hide'); el.card.classList.add('hide'); cardResolve = null;
  updatePosterCount();
  for (const k in lastUsed) delete lastUsed[k];
  AU.setWind(false); AU.setRumble(false);
}
function seedCommuters(n) {
  for (let i = 0; i < n; i++) { const c = spawnCommuter(); step(c, rand(0.5, 7), 30 * c.speedMul); }
}
function startGame() {
  resetWorld();
  G.mode = 'play';
  el.title.classList.add('hide'); el.topbar.classList.remove('hide');
  AU.setMusic('main');
  seedCommuters(4);
  G.spawnMode = 'intro';
  const run = RUN;
  story().catch(err => console.error(err));
  // 最終集計用：エンディング前の誤誘導数を記録
  (async () => { await until(() => G.phase === 'end'); if (run === RUN) { S.foolBeforeEnd = S.fooled; S.rushArrived = S.arrived; } })();
}
function toTitle() {
  resetWorld();
  G.mode = 'title'; G.phase = 'title'; G.spawnMode = 'title';
  el.title.classList.remove('hide'); el.topbar.classList.add('hide');
  AU.setMusic('title');
  seedCommuters(10);
}
$('btn-start').addEventListener('click', () => { AU.init(); startGame(); });
$('btn-again').addEventListener('click', () => { AU.init(); startGame(); });
$('btn-title').addEventListener('click', () => { AU.init(); toTitle(); });
document.addEventListener('visibilitychange', () => { last = performance.now(); });
// キーボード（PC）：1〜5で道具切り替え
addEventListener('keydown', e => {
  const i = '12345'.indexOf(e.key);
  if (i >= 0 && G.mode === 'play') { const t = ['place', 'move', 'remove', 'scale', 'tape'][i]; if (G.unlocked[t] && !G.toolsLocked) { setTool(t); toolBtns[i].classList.remove('new'); } }
  if (e.key === 'm' || e.key === 'M') el.mute.click();
});

/* テスト用フック（URL に #fast で4倍速） */
if (/fast/.test(location.hash)) G.speed = 4;
async function simulate(cfg, seconds) {   // 検証用：ポスター配置を固定して客の流れだけを高速計算
  resetWorld(); G.mode = 'play'; setPhase(cfg.phase || 'p2', ''); G.spawnMode = cfg.phase || 'p2'; G.mgrHold = !!cfg.noManager;
  (cfg.posters || []).forEach(c => {
    const p = { id: ++POSTER_ID, slot: c.slot, scale: c.scale || 1, scaleShow: c.scale || 1, taped: !!c.taped, tapeShow: 1, strips: [{ lift: 0, gone: false }, { lift: 0, gone: false }], fooled: 0, carried: false, pend: 0 };
    posters.push(p); SLOTS[c.slot].poster = p;
  });
  seedCommuters(4);
  const n = Math.round(seconds / 0.05);
  for (let i = 0; i < n; i++) { update(0.05); await null; }
  const r = Object.assign({}, S, { seekersLeft: people.filter(p => p.kind === 'seeker').length });
  if (!cfg.keep) toTitle();
  return r;
}
function jumpEnding(cfg) {   // 検証用：エンディングだけを再生
  resetWorld(); G.mode = 'play'; el.title.classList.add('hide'); el.topbar.classList.remove('hide'); el.toolbar.classList.remove('hide');
  (cfg.posters || []).forEach(c => {
    const p = { id: ++POSTER_ID, slot: c.slot, scale: c.scale || 1, scaleShow: c.scale || 1, taped: true, tapeShow: 1, strips: [{ lift: 0, gone: false }, { lift: 0, gone: false }], fooled: 0, carried: false, pend: 0 };
    posters.push(p); SLOTS[c.slot].poster = p;
  });
  seedCommuters(5); setPhase('peace', '平和'); mgr.baseExpr = 'happy';
  ending();
}
window.__toilet = { jumpEnding, simulate, update, G, get S() { return S; }, get people() { return people; }, get posters() { return posters; }, SLOTS, mgr, onTap, posterRect, setTool, startGame };

resize();
buildBG();
toTitle();
if (document.fonts && document.fonts.load) document.fonts.load('12px "DotGothic16"').catch(() => {});
requestAnimationFrame(frame);
})();
