/* =========================================================
 * 業種別の背景SVG
 *   Scenes.render(key, q) → 背景（viewBox 800x450）の文字列
 *   壁は y=0〜330、床は y=330〜450。人物の足元は y=410 付近。
 *   共通部品（部屋・扉・窓・棚・ポスターなど）を組み合わせて描く。
 * ========================================================= */
(function () {
  'use strict';
  const sh = function (c, a) { return window.Chars.shade(c, a); };
  const esc = function (t) { return window.Chars.esc(t); };

  /* ---------- 基本図形 ---------- */
  function R(x, y, w, h, f, ex) { return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="' + f + '" ' + (ex || '') + '/>'; }
  function C(x, y, r, f, ex) { return '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="' + f + '" ' + (ex || '') + '/>'; }
  function E(x, y, rx, ry, f, ex) { return '<ellipse cx="' + x + '" cy="' + y + '" rx="' + rx + '" ry="' + ry + '" fill="' + f + '" ' + (ex || '') + '/>'; }
  function P(d, f, ex) { return '<path d="' + d + '" fill="' + f + '" ' + (ex || '') + '/>'; }
  function L(d, c, w, ex) { return '<path d="' + d + '" fill="none" stroke="' + c + '" stroke-width="' + (w || 2) + '" stroke-linecap="round" ' + (ex || '') + '/>'; }
  function T(x, y, s, txt, f, ex) { return '<text x="' + x + '" y="' + y + '" font-size="' + s + '" fill="' + f + '" text-anchor="middle" font-weight="700" ' + (ex || '') + '>' + esc(txt) + '</text>'; }

  /* ---------- 共通部品 ---------- */
  function room(o) {
    let s = R(0, 0, 800, 332, o.wall);
    if (o.wallLow) s += R(0, o.lowY || 250, 800, 332 - (o.lowY || 250), o.wallLow) + R(0, (o.lowY || 250) - 4, 800, 6, o.rail || sh(o.wallLow, -20));
    s += R(0, 326, 800, 8, o.trim || sh(o.wall, -40));
    s += R(0, 332, 800, 118, o.floor);
    const fl = sh(o.floor, -22);
    if (o.floorType === 'wood') {
      [352, 378, 410, 446].forEach(function (y) { s += L('M0,' + y + ' H800', fl, 2, 'opacity=".5"'); });
    } else if (o.floorType === 'tile') {
      [360, 395, 440].forEach(function (y) { s += L('M0,' + y + ' H800', fl, 1.5, 'opacity=".5"'); });
      for (let i = -6; i <= 14; i++) s += L('M' + (400 + i * 60) + ',332 L' + (400 + i * 95) + ',450', fl, 1.5, 'opacity=".45"');
    } else if (o.floorType === 'check') {
      for (let r = 0; r < 4; r++) for (let i = 0; i < 20; i++) if ((r + i) % 2) s += R(i * 40, 332 + r * 30, 40, 30, fl, 'opacity=".55"');
    } else if (o.floorType === 'tatami') {
      s += L('M0,370 H800 M0,412 H800 M200,332 V370 M520,332 V370 M340,370 V412 M660,370 V412 M120,412 V450 M460,412 V450', '#9b9156', 2, 'opacity=".55"');
    } else if (o.floorType === 'carpet') {
      s += R(0, 332, 800, 118, 'url(#sc-dots)', 'opacity=".25"');
    }
    return s;
  }
  function defs() {
    return '<defs>' +
      '<pattern id="sc-dots" width="14" height="14" patternUnits="userSpaceOnUse"><circle cx="3" cy="3" r="1.6" fill="#000"/></pattern>' +
      '<pattern id="sc-pole" width="24" height="24" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><rect width="24" height="24" fill="#fff"/><rect width="8" height="24" fill="#d8323c"/><rect x="12" width="8" height="24" fill="#2952a3"/></pattern>' +
      '<linearGradient id="sc-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8fcdf0"/><stop offset="1" stop-color="#dff2fb"/></linearGradient>' +
      '<linearGradient id="sc-night" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1d2b55"/><stop offset="1" stop-color="#3c4f86"/></linearGradient>' +
      '<linearGradient id="sc-glass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d9f1fb"/><stop offset="1" stop-color="#9cc9e0"/></linearGradient>' +
      '</defs>';
  }
  function door(x, o) {
    o = o || {};
    const f = o.color || '#c9b79a';
    let s = R(x - 6, 128, 102, 204, sh(f, -35));
    s += R(x, 134, 90, 198, f);
    s += R(x + 12, 148, 66, 80, o.glass || 'url(#sc-glass)', 'opacity=".9"');
    s += L('M' + (x + 22) + ',158 l20,20', '#fff', 3, 'opacity=".6"');
    s += C(x + 76, 250, 5, '#a68a4a');
    s += exitSign(x + 45, 112);
    return s;
  }
  function exitSign(x, y) {
    return R(x - 26, y - 11, 52, 20, '#2e9e57', 'rx="3"') + T(x, y + 4, 12, '出口', '#fff');
  }
  function autodoor(x, w, o) {
    o = o || {};
    let s = R(x - 8, 110, w + 16, 222, o.frame || '#8b97a3');
    s += R(x, 118, w, 214, o.glass || 'url(#sc-glass)');
    s += L('M' + (x + w / 2) + ',118 V332', o.frame || '#8b97a3', 4);
    s += L('M' + (x + 14) + ',130 l30,40 M' + (x + w / 2 + 14) + ',130 l30,40', '#fff', 3, 'opacity=".55"');
    if (o.label) s += T(x + w / 2, 230, 13, o.label, '#4f6375', 'opacity=".8"');
    return s;
  }
  function windowBox(x, y, w, h, o) {
    o = o || {};
    let s = R(x - 6, y - 6, w + 12, h + 12, o.frame || '#f4f1ea');
    s += R(x, y, w, h, o.night ? 'url(#sc-night)' : 'url(#sc-sky)');
    if (o.night) s += C(x + w - 28, y + 26, 11, '#fff3c4') + C(x + w - 23, y + 22, 10, 'url(#sc-night)') + C(x + 24, y + 40, 1.6, '#fff') + C(x + 60, y + 20, 1.2, '#fff');
    else s += E(x + 40, y + h - 20, 34, 12, '#fff', 'opacity=".8"') + E(x + w - 40, y + 30, 24, 9, '#fff', 'opacity=".7"');
    s += L('M' + (x + w / 2) + ',' + y + ' V' + (y + h) + ' M' + x + ',' + (y + h / 2) + ' H' + (x + w), o.frame || '#f4f1ea', 5);
    return s;
  }
  function blinds(x, y, w, h) {
    let s = R(x - 5, y - 5, w + 10, h + 10, '#ece6d8') + R(x, y, w, h, 'url(#sc-sky)');
    for (let i = 0; i < h; i += 9) s += R(x, y + i, w, 6, '#f2ede2', 'opacity=".92"');
    return s;
  }
  function plant(x, y, s) {
    s = s || 1;
    return '<g transform="translate(' + x + ',' + y + ') scale(' + s + ')">' +
      P('M-18,0 L18,0 L14,-30 L-14,-30Z', '#c97b4a') +
      E(0, -52, 16, 26, '#5aa864') + E(-16, -44, 12, 20, '#4b9656', 'transform="rotate(-25 -16 -44)"') + E(16, -44, 12, 20, '#4b9656', 'transform="rotate(25 16 -44)"') +
      '</g>';
  }
  function poster(x, y, w, h, bg, lines, fg) {
    let s = R(x + 3, y + 4, w, h, '#000', 'opacity=".08"') + R(x, y, w, h, bg, 'stroke="' + sh(bg, -30) + '" stroke-width="1.5"');
    (lines || []).forEach(function (ln, i) {
      s += T(x + w / 2, y + 22 + i * (ln.s || 14) * 1.35 + (ln.dy || 0), ln.s || 14, ln.t, ln.c || fg || '#333');
    });
    return s;
  }
  function plate(x, y, w, txt, bg, fg, size) {
    size = size || 16;
    return R(x - w / 2, y - size - 2, w, size + 14, bg, 'rx="4"') + T(x, y + 2, size, txt, fg || '#fff');
  }
  function clock(x, y) {
    return C(x, y, 18, '#fff', 'stroke="#555" stroke-width="3"') + L('M' + x + ',' + y + ' V' + (y - 11) + ' M' + x + ',' + y + ' H' + (x + 8), '#333', 2.4);
  }
  function counter(x, y, w, h, top, front) {
    return R(x, y, w, 10, top) + R(x + 4, y + 10, w - 8, h, front) + L('M' + (x + 4) + ',' + (y + 22) + ' H' + (x + w - 4), sh(front, -18), 2);
  }
  function lamp(x, y, c) {
    return L('M' + x + ',0 V' + (y - 16), '#555', 2) + P('M' + (x - 18) + ',' + y + ' L' + (x - 8) + ',' + (y - 18) + ' L' + (x + 8) + ',' + (y - 18) + ' L' + (x + 18) + ',' + y + 'Z', c || '#f3c969') + E(x, y + 2, 14, 4, '#fff7d6', 'opacity=".8"');
  }
  function books(x, y, w, h) {
    const cols = ['#c94f4f', '#3f6fb5', '#e3b23c', '#4f9a6b', '#8a5aa8', '#e07a3f', '#2f4858', '#d9d2c3'];
    let s = '', cx = x, i = 0;
    while (cx < x + w - 6) {
      const bw = 7 + ((i * 7) % 6), bh = h - ((i * 5) % 9);
      s += R(cx, y + (h - bh), bw, bh, cols[(i * 3 + Math.floor(x)) % cols.length]);
      cx += bw + 1; i++;
    }
    return s;
  }
  function shelf(x, y, w, h, rows, fill) {
    let s = R(x, y, w, h, '#a87b52') + R(x + 6, y + 6, w - 12, h - 12, '#7c5634');
    const rh = (h - 12) / rows;
    for (let r = 0; r < rows; r++) {
      const ry = y + 6 + r * rh;
      s += fill(x + 8, ry + 4, w - 16, rh - 10, r);
      s += R(x + 6, ry + rh - 6, w - 12, 6, '#a87b52');
    }
    return s;
  }
  function chair(x, y, c) {
    return R(x - 18, y - 70, 36, 44, c, 'rx="6"') + R(x - 22, y - 30, 44, 10, sh(c, -15), 'rx="4"') + L('M' + (x - 16) + ',' + (y - 20) + ' V' + y + ' M' + (x + 16) + ',' + (y - 20) + ' V' + y, '#666', 3);
  }
  function table(x, y, w, c, cloth) {
    let s = R(x, y, w, 8, c);
    if (cloth) s += P('M' + x + ',' + y + ' H' + (x + w) + ' L' + (x + w + 6) + ',' + (y + 36) + ' H' + (x - 6) + 'Z', cloth);
    s += L('M' + (x + 10) + ',' + (y + 8) + ' V' + (y + 70) + ' M' + (x + w - 10) + ',' + (y + 8) + ' V' + (y + 70), sh(c, -30), 4);
    return s;
  }
  function box(x, y, w, h, label) {
    return R(x, y, w, h, '#d4a86a', 'stroke="#a97e45" stroke-width="1.5"') + L('M' + x + ',' + (y + 10) + ' H' + (x + w) + ' M' + (x + w / 2) + ',' + y + ' V' + (y + 10), '#b88a50', 2) +
      (label ? R(x + w / 2 - 22, y + h / 2 - 8, 44, 18, '#fff', 'opacity=".85"') + T(x + w / 2, y + h / 2 + 6, 11, label, '#555') : '');
  }
  function cone(x, y) {
    return P('M' + (x - 14) + ',' + y + ' L' + (x - 4) + ',' + (y - 40) + ' L' + (x + 4) + ',' + (y - 40) + ' L' + (x + 14) + ',' + y + 'Z', '#f07b2e') +
      R(x - 10, y - 26, 20, 7, '#fff') + R(x - 18, y - 4, 36, 6, '#d65f1a');
  }
  function flowers(x, y, cols, n) {
    let s = '';
    for (let i = 0; i < (n || 5); i++) {
      const fx = x + (i % 3) * 12 - 12 + (i > 2 ? 6 : 0), fy = y - (i > 2 ? 14 : 0) - (i % 2) * 6;
      s += L('M' + fx + ',' + fy + ' L' + x + ',' + (y + 22), '#5a9a52', 2);
      s += C(fx, fy, 7, cols[i % cols.length]) + C(fx, fy, 2.6, '#fff3b0');
    }
    return s;
  }
  function bucket(x, y, cols) {
    return flowers(x, y - 30, cols, 6) + P('M' + (x - 20) + ',' + (y - 30) + ' H' + (x + 20) + ' L' + (x + 16) + ',' + y + ' H' + (x - 16) + 'Z', '#9aa7b0');
  }
  function clinic(o) {
    let s = room({ wall: o.wall || '#eef5f3', wallLow: o.wallLow || '#cfe4de', floor: o.floor || '#d9e4e6', floorType: 'tile' });
    s += windowBox(470, 50, 140, 110, { night: o.night });
    s += plate(140, 40, 200, o.sign, o.signBg || '#2f8f83', '#fff', 18);
    return s;
  }
  function stool(x, y, c) {
    return E(x, y - 54, 18, 6, c) + L('M' + x + ',' + (y - 50) + ' V' + y, '#777', 4) + E(x, y, 14, 4, '#777');
  }

  /* ---------- 業種別シーン ---------- */
  const S = {};

  S.funeral = function () {
    let s = room({ wall: '#ecebef', floor: '#8e8a9b', floorType: 'carpet' });
    s += R(0, 26, 800, 8, '#1e1e22');
    // 鯨幕（白黒の縦縞）
    for (let i = 0; i < 800; i += 40) s += R(i, 34, 20, 292, '#1f1f24');
    for (let i = 20; i < 800; i += 40) s += R(i, 34, 20, 292, '#f6f6f3');
    // 祭壇
    s += P('M250,326 L270,250 L530,250 L550,326Z', '#f4f1ea') + P('M285,250 L300,190 L500,190 L515,250Z', '#ebe6dc') + P('M320,190 L330,150 L470,150 L480,190Z', '#e3ddd0');
    for (let i = 0; i < 13; i++) s += C(272 + i * 21, 252 + (i % 2) * 4, 12, '#fff', 'stroke="#e2e2da"');
    for (let i = 0; i < 10; i++) s += C(300 + i * 22, 192 + (i % 2) * 4, 11, '#fff', 'stroke="#e2e2da"');
    for (let i = 0; i < 8; i++) s += C(326 + i * 21, 152, 10, '#fbfbf6', 'stroke="#e2e2da"');
    // 遺影
    s += R(366, 64, 68, 86, '#1b1b1b') + R(372, 70, 56, 74, '#b9bec4') + C(400, 98, 13, '#8e959c') + P('M378,144 Q400,110 422,144Z', '#8e959c');
    s += P('M366,64 L382,64 L366,82Z M434,64 L418,64 L434,82Z', '#111');
    // ろうそく・供花
    s += R(234, 216, 8, 34, '#fff') + E(238, 210, 3.5, 7, '#ffb347') + R(558, 216, 8, 34, '#fff') + E(562, 210, 3.5, 7, '#ffb347');
    s += R(40, 230, 70, 96, '#e9e5dc') + flowers(75, 200, ['#fff', '#f4f4e8', '#fffbe0'], 6);
    s += R(690, 230, 70, 96, '#e9e5dc') + flowers(725, 200, ['#fff', '#f4f4e8', '#fffbe0'], 6);
    return s;
  };

  S.er = function () {
    let s = room({ wall: '#eef4f3', wallLow: '#d2e6e1', floor: '#cfdedb', floorType: 'tile' });
    s += autodoor(600, 180, { label: '自動ドア' });
    s += R(30, 20, 250, 64, '#d6303a', 'rx="6"') + T(155, 60, 30, '救急外来', '#fff', 'letter-spacing="6"') + T(155, 78, 11, 'EMERGENCY', '#ffd9d9', 'letter-spacing="4"');
    s += poster(330, 40, 180, 70, '#ffffff', [{ t: '夜間・休日 受付', s: 16 }, { t: '→ 受付はこちら', s: 13, c: '#2f8f83', dy: 4 }]);
    s += windowBox(360, 140, 120, 80, { night: true });
    // ストレッチャー
    s += R(10, 300, 150, 14, '#e8ecef', 'rx="5"') + R(14, 290, 140, 12, '#fff', 'rx="6"') + R(16, 282, 36, 12, '#ffffff', 'rx="6" stroke="#ddd"');
    s += L('M30,314 V346 M140,314 V346 M30,330 H140', '#8f9aa5', 4) + C(30, 350, 6, '#444') + C(140, 350, 6, '#444');
    s += C(560, 30, 10, '#ff4d4d') + R(552, 36, 16, 8, '#999');
    return s;
  };

  S.locksmith = function () {
    let s = room({ wall: '#e7dcc6', floor: '#b8b1a3', floorType: 'tile' });
    for (let y = 20; y < 320; y += 22) s += L('M0,' + y + ' H800', '#d4c6aa', 2);
    // 玄関扉
    s += R(504, 96, 156, 236, '#7d5a3c') + R(514, 106, 136, 226, '#9a6f49');
    s += R(530, 124, 104, 80, '#8a6141', 'rx="4"') + R(530, 222, 104, 90, '#8a6141', 'rx="4"');
    s += R(622, 200, 12, 40, '#d6b44a', 'rx="3"') + C(628, 210, 3, '#333') + R(626, 212, 4, 8, '#333');
    s += plate(582, 82, 70, '205', '#f1ece0', '#555', 14) + R(680, 180, 40, 30, '#c64a3a', 'rx="4"') + R(690, 186, 20, 4, '#333');
    s += R(30, 120, 120, 100, '#f4f1ea') + R(36, 126, 108, 88, 'url(#sc-sky)') + L('M90,126 V214', '#f4f1ea', 4);
    // 工具箱と鍵
    s += R(40, 360, 110, 46, '#d6303a', 'rx="4"') + R(40, 352, 110, 14, '#b9262f', 'rx="3"') + L('M78,352 Q95,336 112,352', '#555', 4) + R(84, 376, 22, 10, '#ddd');
    s += C(110, 312, 16, 'none', 'stroke="#d6b44a" stroke-width="7"') + L('M124,318 H170 M154,318 v10 M164,318 v8', '#d6b44a', 7);
    s += plant(470, 332, 0.8);
    return s;
  };

  S.pest = function () {
    let s = room({ wall: '#f6f3ea', floor: '#d6cbb3', floorType: 'check' });
    // タイルの壁
    s += R(250, 150, 400, 90, '#ffffff');
    for (let x = 250; x <= 650; x += 25) s += L('M' + x + ',150 V240', '#e3e3de', 1.5);
    for (let y = 150; y <= 240; y += 25) s += L('M250,' + y + ' H650', '#e3e3de', 1.5);
    // 吊り戸棚・流し台
    s += R(250, 50, 400, 90, '#e8d3b5') + L('M350,50 V140 M450,50 V140 M550,50 V140', '#c9b08a', 2);
    s += R(250, 240, 400, 92, '#e8d3b5') + R(250, 236, 400, 10, '#b9c2c9') + L('M350,250 V326 M450,250 V326 M550,250 V326', '#c9b08a', 2);
    s += R(410, 226, 70, 14, '#c9d1d7', 'rx="4"') + L('M445,226 V200 Q445,190 458,190', '#9aa5ae', 5);
    // 冷蔵庫
    s += R(680, 80, 100, 252, '#f2f5f7', 'stroke="#cfd6db" stroke-width="2" rx="6"') + L('M680,170 H780 M694,110 V150 M694,190 V250', '#aab4bc', 3);
    // 噴霧器
    s += R(40, 270, 54, 80, '#e2e8ec', 'rx="10"') + R(56, 256, 22, 16, '#3d6fb0', 'rx="3"') + L('M94,290 Q130,280 140,240 L150,228', '#333', 4);
    s += C(67, 310, 15, '#fff', 'stroke="#d6303a" stroke-width="3"') + E(67, 310, 7, 5, '#5a3a22') + L('M56,300 L78,320', '#d6303a', 3);
    // 小箱（トラップ）
    s += R(150, 360, 44, 22, '#f3d36b', 'stroke="#c9a83a"') + R(560, 350, 44, 22, '#f3d36b', 'stroke="#c9a83a"');
    return s;
  };

  S.datarecovery = function () {
    let s = room({ wall: '#e6ecf2', wallLow: '#d4dde6', floor: '#c4ccd4', floorType: 'tile' });
    s += plate(140, 40, 210, 'データ復旧ラボ', '#2b4c7e', '#fff', 18);
    s += plate(560, 40, 140, 'CLEAN BENCH', '#5d7a99', '#fff', 13);
    // 作業机
    s += R(300, 250, 380, 12, '#7e8b97') + L('M320,262 V330 M660,262 V330', '#5e6a75', 6);
    s += R(470, 160, 130, 86, '#333a42', 'rx="5"') + R(478, 168, 114, 66, '#0f2238') + R(486, 212, 98, 10, '#264466') + R(486, 212, 98, 10, '#5fd38d') + T(535, 196, 12, '復旧完了', '#bfe9ff');
    s += R(525, 246, 20, 6, '#555');
    // 分解したHDD
    s += R(340, 220, 90, 30, '#9aa3ab', 'rx="3"') + C(372, 232, 13, '#d9dde1', 'stroke="#aab1b8"') + C(372, 232, 3, '#777') + L('M386,226 L414,240', '#555', 3);
    s += L('M440,244 L470,236', '#e0b23c', 3);
    // 棚のHDD
    s += shelf(40, 120, 150, 206, 3, function (x, y, w, h) {
      let t = '';
      for (let i = 0; i < 4; i++) t += R(x + i * 32, y + h - 34, 26, 34, '#3d4650', 'rx="2"') + R(x + i * 32 + 4, y + h - 30, 18, 4, '#7ad1a0');
      return t;
    });
    return s;
  };

  S.divorce = function () {
    let s = room({ wall: '#f2ece1', wallLow: '#e1d5c1', floor: '#b79f82', floorType: 'wood' });
    s += plate(140, 40, 210, 'ご相談室', '#8b6f55', '#fff', 18);
    s += R(470, 60, 120, 80, '#c9b18c') + R(478, 68, 104, 64, '#d8e8d0') + P('M478,132 L520,96 L550,118 L582,90 L582,132Z', '#9cc48c');
    s += clock(650, 80);
    // パーティション
    s += R(30, 110, 110, 220, '#e7e2d6', 'stroke="#cbc3b0" stroke-width="3"') + L('M30,180 H140 M30,250 H140', '#cbc3b0', 2);
    // 面談テーブル・書類・ティッシュ
    s += table(300, 270, 250, '#9b7350');
    s += R(340, 258, 70, 12, '#fff', 'stroke="#ccc"') + R(350, 254, 70, 12, '#fffdf4', 'stroke="#ccc"') + T(385, 264, 8, '協議書', '#777');
    s += R(470, 248, 44, 22, '#f2c6d0', 'rx="3"') + P('M484,248 Q492,232 500,248', '#fff');
    s += chair(320, 340, '#8fa4b8') + chair(530, 340, '#8fa4b8');
    s += plant(630, 332, 1);
    return s;
  };

  S.tow = function () {
    let s = R(0, 0, 800, 300, 'url(#sc-sky)');
    s += P('M0,240 Q120,190 260,230 Q420,170 560,226 Q690,190 800,224 V300 H0Z', '#a9d18e');
    s += R(0, 286, 800, 14, '#cfd4d8') + L('M0,282 H800', '#bfc5ca', 4);
    for (let x = 20; x < 800; x += 90) s += L('M' + x + ',282 V300', '#9aa2a9', 4);
    s += R(0, 300, 800, 150, '#5c6168');
    for (let x = 0; x < 800; x += 120) s += R(x, 428, 60, 6, '#f2f2f2');
    // レッカー車
    s += R(20, 200, 210, 70, '#f1b434', 'rx="6"') + R(150, 160, 90, 110, '#f1b434', 'rx="10"') + R(166, 172, 58, 40, '#cfe9f6', 'rx="4"');
    s += L('M60,200 L130,120 L300,170', '#555', 7) + L('M300,170 V228', '#333', 3) + P('M294,228 h12 l-6,10Z', '#333');
    s += C(70, 276, 22, '#2d2d2d') + C(70, 276, 9, '#888') + C(196, 276, 22, '#2d2d2d') + C(196, 276, 9, '#888');
    s += R(170, 150, 50, 10, '#e33', 'rx="4"') + T(110, 244, 15, 'レッカー', '#7a5400');
    // 事故車
    s += P('M300,262 L320,226 L380,212 L460,212 L500,236 L540,244 L540,272 L300,272Z', '#4f7fc0') + P('M300,262 L316,236 L334,250 L322,272Z', '#3a5e92');
    s += P('M390,220 L452,220 L476,238 L384,238Z', '#cfe9f6') + L('M404,222 L420,236 M430,224 L414,236 M440,222 L446,236', '#fff', 1.6);
    s += C(350, 276, 18, '#2d2d2d') + C(500, 276, 18, '#2d2d2d') + E(310, 210, 16, 10, '#ddd', 'opacity=".7"') + E(296, 196, 12, 8, '#e8e8e8', 'opacity=".6"');
    s += cone(620, 330) + cone(700, 330);
    return s;
  };

  S.estate = function () {
    let s = room({ wall: '#efe6d2', floor: '#cfc58d', floorType: 'tatami', trim: '#a58b62' });
    s += R(0, 20, 800, 10, '#a58b62');
    // 障子
    s += R(500, 50, 200, 200, '#a58b62') + R(506, 56, 188, 188, '#fbf8ef');
    for (let x = 506; x < 694; x += 31) s += L('M' + x + ',56 V244', '#c9b48c', 2);
    for (let y = 56; y < 244; y += 37) s += L('M506,' + y + ' H694', '#c9b48c', 2);
    // 段ボール
    s += box(30, 260, 90, 70, '衣類') + box(40, 196, 80, 64, '食器') + box(130, 270, 80, 60, 'アルバム');
    s += box(600, 268, 90, 62, '本') + box(690, 280, 80, 50, '');
    // 箪笥（布をかけた家具）
    s += R(300, 160, 120, 166, '#8a5d3b') + L('M306,200 H414 M306,240 H414 M306,280 H414', '#6b4529', 3) + C(360, 220, 4, '#d6b44a') + C(360, 260, 4, '#d6b44a');
    s += P('M296,160 Q360,140 424,160 L420,196 Q360,180 300,196Z', '#e9e4d6');
    // 写真立て
    s += R(150, 232, 34, 40, '#6b4f36') + R(155, 237, 24, 30, '#e0d9c8') + C(167, 248, 6, '#b6aa92');
    return s;
  };

  S.salon = function () {
    let s = room({ wall: '#fbf3f3', floor: '#efe9e4', floorType: 'check' });
    s += plate(400, 36, 220, 'HAIR SALON', '#d97a8b', '#fff', 18);
    [40, 300].forEach(function (x) {
      s += R(x, 80, 120, 170, '#e7d9cf', 'rx="8"') + R(x + 8, 88, 104, 154, 'url(#sc-glass)', 'rx="6"');
      for (let i = 0; i < 5; i++) s += C(x + 4, 96 + i * 36, 4.5, '#fff6c8') + C(x + 116, 96 + i * 36, 4.5, '#fff6c8');
      s += R(x + 28, 262, 64, 46, '#3b3b45', 'rx="10"') + R(x + 22, 296, 76, 14, '#2b2b33', 'rx="6"') + L('M' + (x + 60) + ',310 V326', '#888', 6) + E(x + 60, 328, 22, 5, '#888');
    });
    // ハサミ・ドライヤー・ボトル
    s += '<g transform="translate(560,110)">' + C(-10, 0, 9, 'none', 'stroke="#555" stroke-width="4"') + C(10, 0, 9, 'none', 'stroke="#555" stroke-width="4"') + L('M-4,-8 L14,-50 M4,-8 L-14,-50', '#9aa3ab', 5) + '</g>';
    s += P('M620,170 h40 a14,14 0 0 1 0,28 h-40Z', '#d97a8b') + R(626, 196, 14, 30, '#c56677', 'rx="4"');
    s += R(520, 240, 160, 8, '#d9c7b8') + R(530, 210, 16, 30, '#7fb5d6', 'rx="4"') + R(552, 216, 14, 24, '#f2b6c6', 'rx="4"') + R(572, 206, 16, 34, '#b8d98f', 'rx="4"');
    s += plant(475, 332, 0.9);
    return s;
  };

  S.barber = function () {
    let s = room({ wall: '#e9f1f7', wallLow: '#c4d7e6', floor: '#e8e2d8', floorType: 'check' });
    s += plate(400, 36, 200, '理容', '#2952a3', '#fff', 20);
    // サインポール
    s += R(44, 70, 36, 200, 'url(#sc-pole)', 'rx="16"') + R(40, 60, 44, 14, '#ccc', 'rx="6"') + R(40, 266, 44, 14, '#ccc', 'rx="6"');
    s += R(46, 70, 10, 200, '#fff', 'opacity=".25"');
    // 鏡と理容椅子
    s += R(300, 80, 200, 150, '#cfd8df', 'rx="6"') + R(308, 88, 184, 134, 'url(#sc-glass)', 'rx="4"');
    s += R(350, 240, 100, 60, '#7a2f2f', 'rx="12"') + R(340, 290, 120, 16, '#5c2222', 'rx="6"') + R(392, 306, 16, 22, '#aaa') + E(400, 330, 40, 6, '#999');
    s += R(520, 210, 120, 8, '#bfa98d') + R(530, 180, 16, 30, '#3d9970', 'rx="3"') + R(552, 186, 14, 24, '#f5f5f5', 'stroke="#ccc"') + R(572, 176, 18, 34, '#c0392b', 'rx="3"');
    s += clock(660, 90);
    return s;
  };

  S.restaurant = function () {
    let s = room({ wall: '#f5e9d7', wallLow: '#8c3b2e', lowY: 230, floor: '#a8764c', floorType: 'wood' });
    s += plate(400, 36, 240, 'RESTAURANT', '#8c3b2e', '#fff', 18);
    s += R(60, 80, 90, 70, '#6b4a2b') + R(66, 86, 78, 58, '#e7d7a8') + C(105, 115, 16, '#e88a3a') ;
    s += R(470, 80, 90, 70, '#6b4a2b') + R(476, 86, 78, 58, '#c8e0c0') + P('M476,144 L505,110 L525,128 L554,100 V144Z', '#7aaa6a');
    // テーブルと料理
    s += table(260, 262, 180, '#8a5a36', '#ffffff');
    s += E(320, 258, 30, 8, '#fff', 'stroke="#ddd"') + E(320, 254, 20, 8, '#f4c542') + L('M308,252 Q320,246 332,252', '#d6303a', 3);
    s += R(380, 236, 4, 22, '#ccc') + P('M372,224 h20 l-4,14 h-12Z', '#e9f3f8', 'stroke="#bbb"');
    // レジ
    s += counter(600, 250, 150, 80, '#6b4a2b', '#8a5a36') + R(640, 220, 60, 32, '#333', 'rx="4"') + R(648, 226, 30, 12, '#7ad1a0');
    s += poster(640, 120, 100, 80, '#2e2e2e', [{ t: 'MENU', s: 14, c: '#ffd166' }, { t: 'オムライス', s: 11, c: '#fff' }, { t: 'ハンバーグ', s: 11, c: '#fff' }]);
    return s;
  };

  S.cafe = function () {
    let s = room({ wall: '#e9dcc8', wallLow: '#7a5539', lowY: 240, floor: '#9b7350', floorType: 'wood' });
    s += lamp(300, 70, '#e0a43c') + lamp(500, 70, '#e0a43c');
    s += poster(40, 70, 150, 120, '#2f3a33', [{ t: '本日のブレンド', s: 14, c: '#fff' }, { t: 'ナポリタン', s: 12, c: '#f2e6c8' }, { t: 'クリームソーダ', s: 12, c: '#b8e6c0' }]);
    s += counter(380, 250, 300, 80, '#5b3b24', '#7a5539');
    s += R(420, 196, 70, 54, '#c9ccd0', 'rx="6"') + R(430, 206, 50, 20, '#8a9097') + R(440, 226, 8, 14, '#555') + R(462, 226, 8, 14, '#555');
    for (let i = 0; i < 4; i++) s += P('M' + (530 + i * 30) + ',236 h20 l-2,14 h-16Z', '#fff', 'stroke="#ccc"') + E(540 + i * 30, 236, 10, 3, '#6b4226');
    s += L('M560,224 q4,-8 0,-14 M570,224 q4,-8 0,-14', '#ccc', 2);
    s += plant(240, 332, 1);
    return s;
  };

  S.bakery = function () {
    let s = room({ wall: '#fbf0dc', wallLow: '#e5c9a0', floor: '#d8b98e', floorType: 'tile' });
    s += plate(400, 36, 200, '焼きたて', '#c4782f', '#fff', 20);
    const bread = function (x, y, w, h, r) {
      let t = '';
      for (let i = 0; i < 4; i++) {
        const bx = x + 8 + i * (w / 4);
        if ((i + r) % 3 === 0) t += E(bx + 14, y + h - 10, 16, 10, '#c98a43') + L('M' + (bx + 6) + ',' + (y + h - 12) + ' l6,-4 M' + (bx + 14) + ',' + (y + h - 14) + ' l6,-4', '#e8b77a', 2);
        else if ((i + r) % 3 === 1) t += P('M' + bx + ',' + (y + h - 4) + ' Q' + (bx + 14) + ',' + (y + h - 30) + ' ' + (bx + 28) + ',' + (y + h - 4) + 'Z', '#d9973f');
        else t += R(bx, y + h - 22, 30, 20, '#e0a75a', 'rx="8"');
      }
      return t;
    };
    s += shelf(30, 90, 200, 236, 3, bread) + shelf(560, 90, 200, 236, 3, bread);
    s += counter(290, 270, 220, 60, '#a8764c', '#c4925e');
    s += R(320, 256, 90, 14, '#c9ccd0', 'rx="3"') + L('M430,256 l30,-20 M436,258 l30,-18', '#9aa3ab', 3);
    return s;
  };

  S.bookstore = function () {
    let s = room({ wall: '#f4efe6', floor: '#c7b49a', floorType: 'wood' });
    const fill = function (x, y, w, h) { return books(x, y, w, h); };
    s += shelf(20, 40, 170, 290, 5, fill) + shelf(560, 40, 220, 290, 5, fill);
    s += P('M250,90 h110 v70 h-110Z', '#ffe066', 'stroke="#e0b800" stroke-width="2"') + T(305, 122, 22, '新刊', '#d6303a') + T(305, 148, 12, '入荷しました', '#555');
    s += R(240, 280, 140, 50, '#a87b52') + books(250, 250, 50, 30) + books(310, 258, 60, 22);
    s += plate(470, 36, 120, 'BOOKS', '#3f6b4f', '#fff', 16);
    return s;
  };

  S.cleaning = function () {
    let s = room({ wall: '#eef6fb', wallLow: '#cfe3f0', floor: '#d0d8de', floorType: 'tile' });
    s += plate(140, 40, 200, '受付・お渡し', '#3a8dc5', '#fff', 16);
    // ハンガーラック
    s += L('M260,80 H780', '#8b97a3', 5);
    const cols = ['#ffffff', '#cfe3f7', '#f7d6d6', '#e7e7e7', '#dbeacb', '#ffffff', '#f5e6c8', '#d9d1f0'];
    for (let i = 0; i < 9; i++) {
      const x = 280 + i * 55;
      s += L('M' + x + ',80 v10', '#666', 2) + P('M' + (x - 22) + ',100 L' + x + ',90 L' + (x + 22) + ',100 L' + (x + 20) + ',230 H' + (x - 20) + 'Z', cols[i % cols.length], 'stroke="#c8d3dc"');
      s += P('M' + (x - 24) + ',96 H' + (x + 24) + ' V236 H' + (x - 24) + 'Z', '#fff', 'opacity=".35"') + R(x - 6, 104, 12, 8, '#ffd166');
    }
    s += counter(20, 250, 240, 80, '#9cb3c4', '#b9cedc') + R(60, 232, 60, 18, '#fff', 'stroke="#bbb"') + R(140, 226, 40, 24, '#e8eef2', 'stroke="#bbb"');
    return s;
  };

  S.cinema = function () {
    let s = room({ wall: '#3b1f2b', floor: '#8a2232', floorType: 'carpet', trim: '#2a131c' });
    s += plate(400, 40, 220, 'SCREEN 3 →', '#f2c14e', '#3b1f2b', 18);
    [40, 170, 520, 650].forEach(function (x, i) {
      const bg = ['#1f4e79', '#7a2e8a', '#2e7a4f', '#a8432e'][i];
      s += R(x - 6, 74, 112, 156, '#d4af37') + R(x, 80, 100, 144, bg);
      s += i % 2 ? C(x + 50, 130, 26, '#ffd166') : P('M' + x + ',200 L' + (x + 40) + ',130 L' + (x + 60) + ',160 L' + (x + 80) + ',120 L' + (x + 100) + ',200Z', '#fff', 'opacity=".75"');
      s += R(x + 14, 196, 72, 6, '#fff', 'opacity=".7"') + R(x + 24, 208, 52, 4, '#fff', 'opacity=".5"');
    });
    // ポップコーン
    s += R(300, 240, 80, 90, '#d6303a') + R(310, 248, 60, 74, '#fff6e6') + P('M300,240 L310,200 H370 L380,240Z', '#f6f1e7', 'stroke="#ddd"');
    for (let i = 0; i < 8; i++) s += C(314 + (i % 4) * 16, 204 + Math.floor(i / 4) * 12, 8, '#fff3c4');
    return s;
  };

  S.hotel = function () {
    let s = room({ wall: '#f3ecdf', wallLow: '#c9b28c', floor: '#7a2e3a', floorType: 'carpet' });
    // シャンデリア
    s += L('M400,0 V40', '#c9a227', 2) + P('M350,40 H450 L430,70 H370Z', '#e9cf6a') + C(360, 76, 5, '#fff7cc') + C(400, 80, 5, '#fff7cc') + C(440, 76, 5, '#fff7cc');
    s += plate(400, 120, 180, 'FRONT', '#2b3e5c', '#e9cf6a', 16);
    // フロントデスク
    s += R(20, 170, 200, 100, '#8b6a46') + R(30, 180, 180, 80, '#a07d55');
    for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) s += R(40 + i * 42, 190 + j * 34, 30, 24, '#7a5a38') + C(55 + i * 42, 206 + j * 34, 3, '#e9cf6a');
    s += counter(240, 248, 300, 82, '#e9e3d6', '#c9b28c') + C(320, 242, 9, '#e9cf6a') + R(310, 244, 20, 4, '#b89a30');
    // 荷物カート
    s += L('M620,150 Q650,120 680,150 M630,150 V316 M670,150 V316', '#d4af37', 5) + R(616, 312, 70, 8, '#d4af37') + C(626, 326, 6, '#333') + C(676, 326, 6, '#333');
    s += R(634, 250, 34, 60, '#3a6a8f', 'rx="4"') + R(638, 210, 26, 40, '#a8432e', 'rx="4"');
    s += plant(740, 332, 1.1);
    return s;
  };

  S.patisserie = function () {
    let s = room({ wall: '#fde8ee', wallLow: '#f6c6d4', floor: '#f3ede6', floorType: 'check' });
    s += plate(400, 40, 240, 'Pâtisserie', '#c45a7a', '#fff', 18);
    // ショーケース
    s += R(250, 200, 360, 130, '#ffffff', 'stroke="#e9cdd6" stroke-width="3"') + R(258, 208, 344, 70, 'url(#sc-glass)', 'opacity=".6"');
    for (let i = 0; i < 6; i++) {
      const x = 280 + i * 54;
      s += P('M' + x + ',270 L' + (x + 34) + ',270 L' + (x + 34) + ',250 L' + x + ',240Z', '#fff3df', 'stroke="#e7c8a4"') + P('M' + x + ',240 L' + (x + 34) + ',250 L' + (x + 34) + ',246 L' + x + ',236Z', '#fff') + C(x + 18, 238, 6, '#e33b4b');
    }
    s += L('M258,290 H602', '#e9cdd6', 3);
    s += C(80, 150, 46, '#fff', 'stroke="#f0b8c8" stroke-width="4"') + T(80, 156, 16, 'Cake', '#c45a7a');
    s += plant(650, 332, 1);
    return s;
  };

  S.florist = function () {
    let s = room({ wall: '#eef6e6', wallLow: '#cfe3bf', floor: '#c7c0b0', floorType: 'tile' });
    s += plate(400, 40, 220, 'FLOWER SHOP', '#5a9a52', '#fff', 16);
    s += R(20, 230, 230, 14, '#a87b52') + R(30, 244, 210, 86, '#8a6141');
    s += bucket(60, 230, ['#f28aa8', '#ff6b6b']) + bucket(130, 230, ['#ffd166', '#ffb347']) + bucket(200, 230, ['#b28dff', '#ffffff']);
    s += bucket(560, 330, ['#ff8c69', '#f28aa8']) + bucket(630, 330, ['#ffffff', '#9ad0ff']) + bucket(700, 330, ['#ffd166', '#f28aa8']);
    s += P('M300,120 L330,220 L360,120Z', '#f5f0e1', 'stroke="#ccc"') + flowers(330, 110, ['#f28aa8', '#ffd166', '#fff'], 6);
    s += P('M480,300 l10,30 h30 l10,-30Z', '#6ca3c9') + L('M520,300 q20,-10 34,-4', '#6ca3c9', 4);
    return s;
  };

  S.onsen = function () {
    let s = room({ wall: '#d9c39a', floor: '#b08a5a', floorType: 'wood', trim: '#7a5a38' });
    for (let x = 0; x < 800; x += 36) s += L('M' + x + ',0 V326', '#c8ad80', 2);
    // のれん
    s += L('M360,60 H780', '#5a3d22', 6);
    s += R(370, 64, 190, 150, '#2f4f8f') + R(570, 64, 190, 150, '#c0392b') + L('M465,64 V214 M665,64 V214', '#fff', 3, 'opacity=".5"');
    s += T(465, 160, 70, 'ゆ', '#fff') + T(665, 160, 70, 'ゆ', '#fff') + T(420, 100, 16, '男', '#fff') + T(720, 100, 16, '女', '#fff');
    // 下足箱
    s += R(20, 120, 200, 206, '#8a6141');
    for (let i = 0; i < 4; i++) for (let j = 0; j < 5; j++) s += R(28 + i * 48, 128 + j * 39, 42, 33, '#a87b52') + R(42 + i * 48, 138 + j * 39, 14, 6, '#e9e2cf');
    // 牛乳ケース
    s += R(250, 240, 80, 90, '#e7eef3', 'stroke="#b8c4cc" stroke-width="2"') + R(258, 248, 64, 60, '#cfe8f7');
    for (let i = 0; i < 3; i++) s += R(264 + i * 20, 262, 12, 30, '#fff', 'rx="3"') + R(264 + i * 20, 258, 12, 6, '#5a9ad6');
    return s;
  };

  S.detective = function () {
    let s = room({ wall: '#e6dfd2', wallLow: '#8a7458', floor: '#6b5640', floorType: 'wood' });
    s += blinds(460, 50, 200, 150);
    s += plate(150, 40, 220, '調査報告', '#3d3a36', '#e8dcc2', 16);
    // 机・ランプ・封筒
    s += R(300, 250, 300, 12, '#5c4128') + R(310, 262, 100, 68, '#4a3320') + R(490, 262, 100, 68, '#4a3320');
    s += L('M540,250 V214 L560,196', '#2d5a3b', 4) + P('M548,196 h30 l-6,-14 h-18Z', '#2d5a3b');
    s += R(350, 236, 60, 14, '#c9a26b', 'transform="rotate(-6 380 243)"') + R(420, 240, 30, 10, '#fff', 'stroke="#ccc" transform="rotate(8 435 245)"');
    s += C(468, 242, 9, 'none', 'stroke="#555" stroke-width="3"') + L('M474,248 L486,256', '#555', 4);
    // 書類棚・帽子掛け
    s += R(40, 130, 100, 196, '#8b97a3') + L('M40,195 H140 M40,260 H140', '#6d7883', 3) + R(78, 160, 24, 6, '#ddd') + R(78, 225, 24, 6, '#ddd') + R(78, 290, 24, 6, '#ddd');
    s += L('M720,120 V326', '#5c4128', 6) + E(720, 326, 26, 6, '#5c4128') + P('M700,124 Q720,96 740,124Z', '#6b5d4a') + R(694, 122, 52, 6, '#6b5d4a', 'rx="3"');
    return s;
  };

  S.nightvet = function () {
    let s = clinic({ sign: '夜間救急', signBg: '#d6303a', night: true, wall: '#eef0f7', wallLow: '#d6dcef' });
    s += poster(640, 50, 120, 140, '#fff', [{ t: '24時間', s: 13 }, { t: '受付中', s: 13, c: '#d6303a' }]);
    s += C(700, 150, 18, '#f2a65a') + C(690, 138, 6, '#f2a65a') + C(710, 138, 6, '#f2a65a');
    s += '<g transform="translate(90,120)">' + C(0, 20, 18, '#f2a65a') + C(-18, -4, 8, '#f2a65a') + C(-6, -12, 8, '#f2a65a') + C(8, -12, 8, '#f2a65a') + C(20, -4, 8, '#f2a65a') + '</g>';
    s += R(40, 290, 90, 40, '#d9dee2', 'rx="3"') + R(46, 284, 78, 8, '#bfc6cc') + T(85, 316, 11, '体重計', '#666');
    s += autodoor(640, 140, {});
    return s;
  };

  S.vetcheck = function () {
    let s = clinic({ sign: 'どうぶつ病院', signBg: '#4fa36b', wall: '#f3f8ee', wallLow: '#d6e9c9', floor: '#e3e9de' });
    s += poster(640, 50, 130, 150, '#fffbe8', [{ t: 'ワクチン', s: 15, c: '#4fa36b' }, { t: '接種のお知らせ', s: 12 }, { t: '毎年1回', s: 12, c: '#d6303a', dy: 8 }]);
    s += '<g transform="translate(700,170)">' + C(0, 0, 14, '#c79a6a') + P('M-14,-6 l-6,-14 l12,6Z M14,-6 l6,-14 l-12,6Z', '#c79a6a') + C(-5, -2, 2, '#333') + C(5, -2, 2, '#333') + '</g>';
    s += R(40, 290, 90, 40, '#d9dee2', 'rx="3"') + R(46, 284, 78, 8, '#bfc6cc') + T(85, 316, 11, '体重計', '#666');
    s += plant(620, 332, 1);
    return s;
  };

  S.plumber = function () {
    let s = room({ wall: '#eef3f6', floor: '#c9d3d9', floorType: 'tile' });
    s += R(300, 160, 300, 30, '#ffffff', 'stroke="#cfd6db" stroke-width="2"') + R(310, 190, 280, 140, '#e7ecef', 'stroke="#cfd6db" stroke-width="2"') + L('M450,190 V330', '#cfd6db', 2);
    s += L('M450,160 V130 Q450,118 466,118', '#9aa5ae', 6);
    s += L('M380,240 V280 H420 V330', '#8b97a3', 8);
    // 水たまり
    s += E(420, 390, 160, 26, '#9fd0ff', 'opacity=".65"') + E(620, 372, 70, 12, '#9fd0ff', 'opacity=".55"') + E(250, 420, 60, 10, '#9fd0ff', 'opacity=".5"');
    s += P('M540,300 h44 l-4,30 h-36Z', '#3d6fb0') + E(562, 300, 22, 5, '#5a8ad0');
    // レンチ
    s += '<g transform="translate(110,360) rotate(-20)">' + R(-40, -5, 80, 10, '#8b97a3', 'rx="4"') + C(-44, 0, 12, '#8b97a3') + C(-44, 0, 5, '#c9d3d9') + '</g>';
    s += plate(140, 40, 200, '水まわり修理', '#3d6fb0', '#fff', 16);
    s += windowBox(640, 60, 110, 90, {});
    return s;
  };

  S.debt = function () {
    let s = room({ wall: '#efebe3', wallLow: '#5c4a3a', lowY: 240, floor: '#7a6650', floorType: 'wood' });
    s += shelf(20, 40, 200, 286, 4, function (x, y, w, h) {
      let t = '', cx = x;
      for (let i = 0; i < 9; i++) { t += R(cx, y, 18, h, ['#5c2a2a', '#2a3a5c', '#3a4a2a'][i % 3]) + R(cx + 3, y + 10, 12, 4, '#d4af37'); cx += 20; }
      return t;
    });
    // 天秤
    s += '<g transform="translate(470,110)">' + L('M0,-40 V40 M-50,-24 H50', '#c9a227', 5) + L('M-50,-24 L-64,6 M-50,-24 L-36,6 M50,-24 L36,6 M50,-24 L64,6', '#c9a227', 2) + P('M-68,6 Q-50,22 -32,6Z M32,6 Q50,22 68,6Z', '#c9a227') + R(-20, 40, 40, 8, '#c9a227') + '</g>';
    s += plate(470, 190, 160, '法律相談', '#2b3e5c', '#fff', 15);
    s += R(300, 260, 300, 12, '#4a3626') + R(310, 272, 280, 58, '#5c4532');
    s += R(330, 244, 60, 16, '#fff', 'stroke="#ccc"') + R(340, 240, 60, 16, '#fffdf4', 'stroke="#ccc"') + T(370, 252, 8, '和解書', '#777');
    s += R(520, 236, 8, 24, '#222') + plant(645, 332, 1);
    return s;
  };

  S.wedding = function () {
    let s = room({ wall: '#fbf8f3', floor: '#e9e1d6', floorType: 'tile' });
    // ステンドグラス
    [80, 640].forEach(function (x) {
      s += P('M' + x + ',220 V100 Q' + (x + 40) + ',50 ' + (x + 80) + ',100 V220Z', '#e9cf6a');
      s += P('M' + (x + 6) + ',214 V102 Q' + (x + 40) + ',60 ' + (x + 74) + ',102 V214Z', '#9ad0ff');
      s += P('M' + (x + 6) + ',160 H' + (x + 74) + ' V214 H' + (x + 6) + 'Z', '#f7b6c8') + L('M' + (x + 40) + ',70 V214', '#e9cf6a', 3);
    });
    // アーチと花
    s += P('M260,326 V160 Q400,40 540,160 V326 H520 V166 Q400,70 280,166 V326Z', '#ffffff', 'stroke="#eee"');
    for (let i = 0; i < 14; i++) {
      const t = i / 13, ang = Math.PI * (1 - t);
      s += C(400 + Math.cos(ang) * 132, 160 - Math.sin(ang) * 88, 11, ['#f7b6c8', '#fff', '#ffe0a8'][i % 3], 'stroke="#f0d0d8"');
    }
    s += P('M380,62 q-16,-20 0,-30 q16,10 0,30Z M420,62 q-16,-20 0,-30 q16,10 0,30Z', '#e9cf6a');
    // ケーキとバージンロード
    s += P('M330,332 L470,332 L560,450 L240,450Z', '#f2f2f2');
    s += R(580, 270, 80, 60, '#fff', 'stroke="#eee"') + R(592, 236, 56, 34, '#fff', 'stroke="#eee"') + R(604, 210, 32, 26, '#fff', 'stroke="#eee"') + C(620, 204, 6, '#e33b4b');
    return s;
  };

  S.nosmoke = function () {
    let s = clinic({ sign: '禁煙外来', signBg: '#2f8f83' });
    s += '<g transform="translate(690,130)">' + C(0, 0, 54, '#fff', 'stroke="#d6303a" stroke-width="10"') + R(-36, -8, 60, 16, '#fff', 'stroke="#999" stroke-width="2"') + R(24, -8, 12, 16, '#f08a3b') + L('M-38,-38 L38,38', '#d6303a', 10) + '</g>';
    s += T(690, 210, 13, '今日から禁煙', '#555');
    s += R(60, 250, 70, 80, '#e7ecef', 'rx="6" stroke="#cfd6db"') + R(70, 262, 50, 24, '#264466') + T(95, 279, 10, 'CO 2ppm', '#7ad1a0') + L('M95,250 Q110,220 130,226', '#999', 3);
    s += plant(620, 332, 0.9);
    return s;
  };

  S.glass = function () {
    let s = room({ wall: '#e9e4da', floor: '#b6aea0', floorType: 'tile' });
    s += plate(140, 40, 200, 'ガラス修理', '#4b7f9e', '#fff', 16);
    // 割れた窓
    s += R(440, 70, 240, 180, '#f4f1ea') + R(450, 80, 105, 160, 'url(#sc-glass)') + R(565, 80, 105, 160, 'url(#sc-glass)');
    s += L('M590,120 L620,150 L606,190 M620,150 L650,140 M620,150 L640,200 M606,190 L580,210', '#fff', 2.4);
    s += L('M565,80 L670,240 M670,80 L565,240', '#f2c14e', 6, 'opacity=".85"');
    // 立てかけたガラス板
    s += P('M60,326 L80,150 L170,150 L150,326Z', '#cfe9f6', 'opacity=".8" stroke="#9cc9e0" stroke-width="3"') + P('M110,326 L130,170 L210,170 L190,326Z', '#d9f1fb', 'opacity=".7" stroke="#9cc9e0" stroke-width="3"');
    s += L('M90,190 l30,40', '#fff', 3, 'opacity=".7"');
    // 吸盤
    s += '<g transform="translate(260,300)">' + E(-20, 0, 16, 8, '#d6303a') + E(20, 0, 16, 8, '#d6303a') + R(-24, -16, 48, 12, '#555', 'rx="5"') + '</g>';
    return s;
  };

  S.yobiko = function () {
    let s = room({ wall: '#f2efe6', floor: '#c9b48c', floorType: 'wood' });
    s += R(200, 50, 400, 180, '#9aa5ae') + R(208, 58, 384, 164, '#fbfbfb');
    s += P('M240,80 H560 L548,140 H252Z', '#d6303a') + T(400, 122, 38, '祝 合格', '#fff', 'letter-spacing="8"');
    s += T(400, 170, 16, '第一志望 合格者 続々！', '#333') + T(400, 200, 13, '今年もありがとう！受験生の皆さん', '#3f6fb5');
    s += R(320, 228, 160, 6, '#9aa5ae');
    s += poster(40, 70, 120, 150, '#fff6d6', [{ t: '必勝', s: 30, c: '#d6303a' }, { t: '合格まで', s: 12 }, { t: 'あと0日', s: 13, c: '#d6303a' }]);
    s += R(640, 270, 120, 10, '#a87b52') + L('M650,280 V330 M750,280 V330', '#777', 4) + R(660, 250, 60, 20, '#3f6fb5');
    s += R(40, 270, 120, 10, '#a87b52') + L('M50,280 V330 M150,280 V330', '#777', 4);
    s += clock(700, 80);
    return s;
  };

  S.konkatsu = function () {
    let s = room({ wall: '#fff3ef', wallLow: '#f7d9cf', floor: '#d9c2b0', floorType: 'wood' });
    s += plate(150, 40, 230, 'ご成婚おめでとう', '#e66a82', '#fff', 15);
    const heart = function (x, y, sc, c) { return P('M' + x + ',' + (y + 10 * sc) + ' C' + (x - 22 * sc) + ',' + (y - 6 * sc) + ' ' + (x - 10 * sc) + ',' + (y - 22 * sc) + ' ' + x + ',' + (y - 10 * sc) + ' C' + (x + 10 * sc) + ',' + (y - 22 * sc) + ' ' + (x + 22 * sc) + ',' + (y - 6 * sc) + ' ' + x + ',' + (y + 10 * sc) + 'Z', c); };
    s += heart(330, 90, 2, '#f7a6b8') + heart(380, 70, 1.2, '#f4c2cf') + heart(660, 90, 1.6, '#f7a6b8');
    s += R(470, 70, 120, 100, '#e9cf6a') + R(478, 78, 104, 84, '#fff') + C(515, 112, 12, '#d9c2b0') + C(545, 112, 12, '#d9c2b0') + P('M495,162 Q515,126 530,162Z M530,162 Q545,126 565,162Z', '#d9c2b0');
    s += R(40, 230, 180, 10, '#a87b52') + R(50, 240, 160, 90, '#c49a70');
    for (let i = 0; i < 5; i++) s += R(60 + i * 28, 192, 22, 38, ['#e66a82', '#6ca3c9', '#f2c14e', '#7fbf7f', '#b28dff'][i], 'rx="2"');
    s += R(600, 260, 160, 60, '#e8a0b0', 'rx="16"') + R(590, 240, 180, 30, '#f2b8c6', 'rx="14"');
    return s;
  };

  S.ortho = function () {
    let s = clinic({ sign: '整形外科', signBg: '#3d6fb0' });
    s += R(640, 50, 120, 150, '#2b2f36', 'rx="4"') + R(648, 58, 104, 134, '#cfe3f7', 'opacity=".9"');
    s += L('M700,72 V178', '#fff', 10) + C(700, 72, 9, '#fff') + C(700, 178, 9, '#fff') + L('M694,124 l12,4', '#2b2f36', 2);
    s += L('M60,330 L90,150 M110,330 L90,150 M70,260 H102', '#9aa5ae', 5) + R(80, 146, 22, 10, '#555', 'rx="4"');
    s += L('M140,330 L160,160 M190,330 L160,160 M150,250 H178', '#9aa5ae', 5) + R(150, 156, 22, 10, '#555', 'rx="4"');
    s += poster(540, 200, 80, 60, '#fff', [{ t: 'リハビリ室', s: 11 }, { t: '→', s: 14, c: '#3d6fb0' }]);
    return s;
  };

  S.lostfound = function () {
    let s = room({ wall: '#e7ebee', wallLow: '#c3ccd3', floor: '#c9c9c4', floorType: 'tile' });
    s += R(0, 400, 800, 14, '#f2c14e');
    for (let x = 6; x < 800; x += 20) s += C(x, 407, 3, '#d9a824');
    s += R(20, 30, 360, 56, '#2b3e5c', 'rx="4"') + T(200, 66, 22, 'お忘れ物承り所', '#fff', 'letter-spacing="3"');
    s += R(440, 30, 330, 56, '#111', 'rx="4"') + T(530, 64, 16, '普通 中央線', '#ffb347') + T(680, 64, 16, '10:42', '#7ad1a0');
    s += counter(20, 250, 320, 80, '#8b97a3', '#aab4bc');
    s += R(30, 110, 300, 140, '#d6dbe0', 'stroke="#aab4bc" stroke-width="3"') + L('M30,180 H330', '#aab4bc', 3);
    for (let i = 0; i < 6; i++) s += L('M' + (50 + i * 22) + ',118 v52 q0,6 -6,6', ['#2f4f8f', '#c0392b', '#333', '#5a9a52', '#888', '#e07a3f'][i], 4);
    s += R(200, 130, 50, 40, '#7a4b2a', 'rx="5"') + R(260, 140, 50, 30, '#6ca3c9', 'rx="3"') + R(60, 196, 40, 30, '#e66a82', 'rx="4"') + R(120, 200, 40, 26, '#333', 'rx="3"') + R(180, 190, 70, 36, '#a87b52', 'rx="5"');
    s += autodoor(620, 160, {});
    return s;
  };

  S.dentist = function () {
    let s = clinic({ sign: '歯科医院', signBg: '#4aa3c8', wall: '#f1f8fb', wallLow: '#d3eaf3', floor: '#dfe8ec' });
    s += '<g transform="translate(700,120)">' + P('M-30,-30 Q-40,-50 -16,-50 Q0,-44 16,-50 Q40,-50 30,-30 Q26,0 18,30 Q12,40 8,20 Q0,6 -8,20 Q-12,40 -18,30 Q-26,0 -30,-30Z', '#fff', 'stroke="#a8d4e6" stroke-width="3"') + C(-10, -24, 3, '#333') + C(10, -24, 3, '#333') + L('M-8,-12 Q0,-4 8,-12', '#333', 2.4) + '</g>';
    s += T(700, 200, 14, '定期検診で歯を守ろう', '#4aa3c8');
    // 診療台
    s += P('M40,300 L120,300 L170,250 L190,262 L140,318 L40,318Z', '#7fc4dd') + R(60, 318, 16, 14, '#999') + L('M160,120 Q200,110 210,150', '#999', 4) + E(210, 156, 18, 10, '#ffffff', 'stroke="#bbb"');
    return s;
  };

  S.blood = function () {
    let s = room({ wall: '#fff3f1', wallLow: '#fbd9d3', floor: '#e9dfd8', floorType: 'tile' });
    s += plate(150, 40, 220, '献血ルーム', '#d6303a', '#fff', 18);
    s += '<g transform="translate(700,130)">' + P('M0,-56 Q-40,-4 -40,20 A40,40 0 0 0 40,20 Q40,-4 0,-56Z', '#e84a5a') + C(-12, 10, 4, '#fff') + C(12, 10, 4, '#fff') + L('M-10,26 Q0,34 10,26', '#fff', 3) + '</g>';
    s += T(700, 210, 13, 'ありがとう！', '#d6303a');
    // 採血用リクライニング
    s += P('M30,300 L150,300 L210,230 L226,240 L170,318 L30,318Z', '#e9a6ae') + R(50, 318, 16, 14, '#999') + L('M60,300 V250 H110', '#999', 3) + R(100, 210, 20, 40, '#d6303a', 'rx="4" opacity=".75"');
    // お菓子と飲み物
    s += R(470, 260, 120, 10, '#d4b48c') + L('M480,270 V330 M580,270 V330', '#999', 3);
    s += R(486, 236, 14, 24, '#f2c14e', 'rx="2"') + R(506, 240, 14, 20, '#7fbf7f', 'rx="2"') + E(552, 254, 20, 6, '#e07a3f');
    return s;
  };

  S.konbini = function () {
    let s = room({ wall: '#f7f9fb', floor: '#e3e7ea', floorType: 'tile' });
    s += R(0, 0, 800, 24, '#2e9e57') + R(0, 24, 800, 8, '#f2c14e') + R(0, 32, 800, 6, '#d6303a');
    const goods = function (x, y, w, h, r) {
      let t = '';
      for (let i = 0; i < Math.floor(w / 22); i++) t += R(x + i * 22, y + h - 24 + ((i + r) % 2) * 4, 18, 24 - ((i + r) % 2) * 4, ['#e66a82', '#f2c14e', '#6ca3c9', '#7fbf7f', '#e07a3f'][(i + r) % 5], 'rx="2"');
      return t;
    };
    s += shelf(20, 90, 180, 236, 4, goods);
    s += R(560, 80, 220, 246, '#cfd8df') + R(568, 88, 204, 230, '#e7f4fb');
    for (let i = 0; i < 3; i++) s += L('M568,' + (146 + i * 58) + ' H772', '#b8c4cc', 3);
    for (let r = 0; r < 4; r++) for (let i = 0; i < 9; i++) s += R(576 + i * 22, 100 + r * 58, 14, 40, ['#f2f2f2', '#6ca3c9', '#7fbf7f', '#e07a3f', '#f2c14e'][(i + r) % 5], 'rx="4"');
    s += counter(240, 250, 260, 80, '#7a8a99', '#cfd8df') + R(270, 214, 60, 36, '#333', 'rx="4"') + R(278, 220, 40, 14, '#7ad1a0') + R(440, 200, 50, 50, '#3a3a3a', 'rx="4"') + R(450, 210, 30, 16, '#c9ccd0');
    s += plate(370, 90, 140, 'レジ', '#2e9e57', '#fff', 16);
    return s;
  };

  S.gym = function () {
    let s = room({ wall: '#e7ebef', floor: '#4a4f57', floorType: 'tile', trim: '#2b2f36' });
    s += R(0, 0, 800, 40, '#f07b2e') + T(400, 30, 22, 'FITNESS', '#fff', 'letter-spacing="10"');
    s += R(260, 70, 260, 200, '#cfd8df') + R(266, 76, 248, 188, 'url(#sc-glass)', 'opacity=".65"');
    // ダンベルラック
    s += R(30, 260, 180, 10, '#555') + L('M40,270 V330 M200,270 V330', '#555', 5);
    for (let i = 0; i < 5; i++) s += R(42 + i * 34, 244, 24, 8, '#888') + R(38 + i * 34, 238, 8, 20, '#222', 'rx="2"') + R(62 + i * 34, 238, 8, 20, '#222', 'rx="2"');
    // ランニングマシン
    s += P('M560,320 L740,320 L760,300 L580,300Z', '#333') + L('M730,300 L750,200 M750,200 H700', '#666', 6) + R(690, 192, 40, 20, '#222', 'rx="4"') + R(698, 198, 24, 8, '#7ad1a0');
    s += R(560, 330, 200, 10, '#2b2f36');
    return s;
  };

  S.seitai = function () {
    let s = room({ wall: '#f4efe4', wallLow: '#ddd1b8', floor: '#b79f82', floorType: 'wood' });
    s += plate(150, 40, 200, 'ほぐし処', '#7a8f5a', '#fff', 18);
    s += poster(640, 50, 110, 160, '#fff', [{ t: '背骨', s: 13 }]);
    for (let i = 0; i < 9; i++) s += R(686, 84 + i * 13, 18, 10, '#e9dcc0', 'rx="3" stroke="#bfa98d"');
    // 施術ベッド
    s += R(30, 270, 240, 26, '#5f7d8c', 'rx="8"') + R(30, 262, 60, 14, '#fff', 'rx="6"') + L('M50,296 V330 M250,296 V330', '#777', 5);
    s += R(140, 254, 60, 10, '#fff', 'rx="3"') + R(146, 246, 48, 10, '#f2e6c8', 'rx="3"');
    s += plant(560, 332, 1.1);
    return s;
  };

  S.ramen = function () {
    let s = room({ wall: '#f1e2c4', floor: '#6b4a2b', floorType: 'wood', trim: '#4a3320' });
    // 木札メニュー
    for (let i = 0; i < 8; i++) {
      const x = 270 + i * 60;
      s += R(x, 60, 44, 110, '#e9d3a5', 'stroke="#a8814f" stroke-width="2"') + T(x + 22, 90, 13, ['醤油', '味噌', '塩', '豚骨', '替玉', '餃子', '炒飯', 'ビール'][i], '#3a2a1a', 'writing-mode="tb" glyph-orientation-vertical="0"');
    }
    s += R(250, 40, 500, 14, '#4a3320');
    // カウンターと丼
    s += counter(240, 250, 540, 80, '#8a5d3b', '#a87b52');
    for (let i = 0; i < 3; i++) {
      const x = 320 + i * 150;
      s += P('M' + (x - 26) + ',236 Q' + x + ',270 ' + (x + 26) + ',236Z', '#d6303a') + E(x, 236, 26, 6, '#e8c37a') + L('M' + (x - 6) + ',226 q4,-10 0,-18 M' + (x + 6) + ',226 q4,-10 0,-18', '#ddd', 2);
    }
    for (let i = 0; i < 4; i++) s += stool(290 + i * 140, 330, '#d6303a');
    // 券売機
    s += R(30, 120, 120, 206, '#d9dee2', 'rx="6" stroke="#aab4bc" stroke-width="2"') + R(42, 136, 96, 40, '#264466');
    for (let i = 0; i < 3; i++) for (let j = 0; j < 4; j++) s += R(42 + i * 34, 190 + j * 24, 28, 18, ['#f2c14e', '#fff', '#e07a3f'][(i + j) % 3], 'rx="2"');
    s += R(40, 300, 100, 10, '#888');
    return s;
  };

  S.karaoke = function () {
    let s = room({ wall: '#2b2453', floor: '#3d356e', floorType: 'carpet', trim: '#1a1538' });
    s += T(400, 70, 46, 'KARAOKE', '#ff6fd8', 'letter-spacing="8" stroke="#fff" stroke-width="1.5"');
    s += L('M400,0 V100', '#999', 2) + C(560, 120, 26, '#c9ccd0') ;
    for (let i = 0; i < 6; i++) s += R(542 + (i % 3) * 12, 104 + Math.floor(i / 3) * 14, 9, 9, '#fff', 'opacity=".75"');
    s += L('M400,100 L560,94', '#999', 2);
    [40, 150].forEach(function (x, i) {
      s += R(x, 140, 90, 186, '#6b5bb8') + R(x + 20, 160, 50, 70, '#8fd3ff', 'opacity=".5"') + T(x + 45, 270, 18, String(101 + i), '#fff');
    });
    s += counter(560, 250, 220, 80, '#ff6fd8', '#4a3f8a') + R(600, 226, 30, 24, '#333', 'rx="4"');
    s += '<g transform="translate(700,232) rotate(-20)">' + R(-4, -6, 8, 30, '#333', 'rx="3"') + C(0, -10, 8, '#999') + '</g>';
    return s;
  };

  // 右端に出口扉を描く（右側に小道具がないシーンのみ）
  const DOOR = { datarecovery: 1, divorce: 1, salon: 1, barber: 1, cafe: 1, patisserie: 1, debt: 1, glass: 1 };

  function render(key, q) {
    const fn = S[key];
    let body = fn ? fn(q) : room({ wall: '#f2f2f2', floor: '#ddd' });
    if (DOOR[key]) body += door(700, {});
    return defs() + body;
  }

  window.Scenes = { render: render, has: function (k) { return !!S[k]; } };
})();
