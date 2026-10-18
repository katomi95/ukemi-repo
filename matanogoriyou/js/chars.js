/* =========================================================
 * 人物SVG生成
 *   person(opts) → <g class="ch"> の文字列
 *   座標系：足元中心が (0,0)。上方向がマイナス。頭の中心は (0,-165)。
 *   表情は data-ex、向きは data-view（front / back）で切り替える。
 * ========================================================= */
(function () {
  'use strict';

  function parseAcc(list) {
    const m = {};
    (list || []).forEach(function (s) {
      const i = s.indexOf(':');
      if (i < 0) m[s] = true; else m[s.slice(0, i)] = s.slice(i + 1);
    });
    return m;
  }

  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    const f = function (v) { return Math.max(0, Math.min(255, Math.round(v + amt))); };
    const r = f(n >> 16), g = f((n >> 8) & 255), b = f(n & 255);
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  const INK = '#2a211c';

  /* ---------- 表情 ---------- */
  function expressions(hc) {
    const brow = function (d) { return '<path d="' + d + '" stroke="' + shade(hc, -10) + '" stroke-width="2.8" fill="none" stroke-linecap="round"/>'; };
    const line = function (d, w, c) { return '<path d="' + d + '" stroke="' + (c || INK) + '" stroke-width="' + (w || 2.6) + '" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'; };
    const dots = '<ellipse cx="-12" cy="-163" rx="3.6" ry="4.6" fill="' + INK + '"/><ellipse cx="12" cy="-163" rx="3.6" ry="4.6" fill="' + INK + '"/>';
    const blush = function (o) { return '<ellipse cx="-21" cy="-152" rx="6.5" ry="3.6" fill="#f08c8c" opacity="' + o + '"/><ellipse cx="21" cy="-152" rx="6.5" ry="3.6" fill="#f08c8c" opacity="' + o + '"/>'; };
    const happyEyes = line('M-18,-161 Q-12,-169 -6,-161') + line('M6,-161 Q12,-169 18,-161');
    const star = function (x, y, s) {
      return '<path transform="translate(' + x + ',' + y + ') scale(' + s + ')" d="M0,-10 L2.6,-2.6 L10,0 L2.6,2.6 L0,10 L-2.6,2.6 L-10,0 L-2.6,-2.6Z" fill="#ffd23f" stroke="#f0a500" stroke-width="1"/>';
    };
    return {
      neutral: dots + brow('M-18,-176 L-7,-177 M7,-177 L18,-176') + line('M-6,-147 Q0,-145 6,-147'),
      smile: dots + brow('M-18,-177 Q-12,-180 -7,-178 M7,-178 Q12,-180 18,-177') + line('M-9,-150 Q0,-141 9,-150') + blush(0.35),
      bigsmile: happyEyes + brow('M-19,-181 Q-12,-186 -6,-182 M6,-182 Q12,-186 19,-181') +
        '<path d="M-13,-153 Q0,-130 13,-153 Z" fill="#b8403a" stroke="' + INK + '" stroke-width="2" stroke-linejoin="round"/>' +
        '<path d="M-6,-141 Q0,-136 6,-141 Q0,-144 -6,-141Z" fill="#f2918c"/>' + blush(0.6) +
        star(-48, -196, 0.9) + star(48, -186, 1.1) + star(40, -214, 0.6),
      happy: happyEyes + brow('M-18,-178 Q-12,-181 -7,-179 M7,-179 Q12,-181 18,-178') + line('M-9,-150 Q0,-141 9,-150') + blush(0.55),
      relieved: line('M-18,-164 Q-12,-159 -6,-164') + line('M6,-164 Q12,-159 18,-164') +
        brow('M-18,-175 Q-12,-177 -7,-176 M7,-176 Q12,-177 18,-175') + line('M-7,-149 Q0,-144 7,-149') + blush(0.4),
      tired: '<ellipse cx="-12" cy="-162" rx="3.4" ry="2.4" fill="' + INK + '"/><ellipse cx="12" cy="-162" rx="3.4" ry="2.4" fill="' + INK + '"/>' +
        line('M-17,-165 L-7,-165', 2.4) + line('M7,-165 L17,-165', 2.4) +
        line('M-17,-157 Q-12,-154 -7,-157', 1.8, '#b98d78') + line('M7,-157 Q12,-154 17,-157', 1.8, '#b98d78') +
        brow('M-18,-171 L-7,-174 M7,-174 L18,-171') +
        '<ellipse cx="0" cy="-146" rx="4" ry="3" fill="#7a3b33"/>',
      sad: '<ellipse cx="-12" cy="-162" rx="3" ry="3.6" fill="' + INK + '"/><ellipse cx="12" cy="-162" rx="3" ry="3.6" fill="' + INK + '"/>' +
        brow('M-18,-172 L-7,-176 M7,-176 L18,-172') + line('M-6,-146 Q0,-148 6,-146'),
      puzzled: '<ellipse cx="-12" cy="-163" rx="3.8" ry="4.8" fill="' + INK + '"/><ellipse cx="12" cy="-162" rx="2.8" ry="3.4" fill="' + INK + '"/>' +
        brow('M-19,-181 Q-12,-186 -6,-181 M7,-175 L18,-174') + line('M-7,-147 Q-3.5,-151 0,-147 Q3.5,-143 7,-147'),
      frozen: '<ellipse cx="0" cy="-156" rx="30" ry="22" fill="#cfe0f4" opacity=".6"/>' +
        line('M-15,-190 v13 M-7,-193 v16 M1,-193 v16 M9,-191 v14', 2.2, '#5677b0') +
        '<circle cx="-12" cy="-163" r="6.5" fill="#fff" stroke="' + INK + '" stroke-width="1.8"/><circle cx="12" cy="-163" r="6.5" fill="#fff" stroke="' + INK + '" stroke-width="1.8"/>' +
        '<circle cx="-12" cy="-163" r="1.6" fill="' + INK + '"/><circle cx="12" cy="-163" r="1.6" fill="' + INK + '"/>' +
        line('M-9,-146 L9,-146', 2.6) +
        '<path d="M31,-184 q6,9 0,12 q-6,-3 0,-12z" fill="#9fd0ff" stroke="#5aa0dd" stroke-width="1"/>'
    };
  }

  /* ---------- 髪 ---------- */
  function hairBehind(style, c) {
    switch (style) {
      case 'long': return '<path d="M-36,-170 Q-40,-120 -30,-112 L30,-112 Q40,-120 36,-170 Z" fill="' + shade(c, -12) + '"/>';
      case 'bob': return '<path d="M-37,-172 Q-40,-138 -30,-134 L30,-134 Q40,-138 37,-172 Z" fill="' + shade(c, -12) + '"/>';
      case 'pony': return '<path d="M26,-190 Q52,-182 44,-140 Q40,-150 30,-168Z" fill="' + shade(c, -12) + '"/>';
      default: return '';
    }
  }
  function hairFront(style, c) {
    switch (style) {
      case 'bald':
        return '<path d="M-34,-160 Q-36,-176 -28,-180 L-26,-158Z M34,-160 Q36,-176 28,-180 L26,-158Z" fill="' + c + '"/>';
      case 'spiky':
        return '<path d="M-35,-163 Q-38,-196 -18,-202 L-14,-212 L-4,-202 L6,-214 L12,-202 L24,-208 L22,-196 Q38,-188 35,-163 Q30,-182 14,-184 L8,-176 L2,-185 Q-18,-186 -35,-163Z" fill="' + c + '"/>';
      case 'long': case 'bob': case 'pony':
        return '<path d="M-36,-162 Q-38,-202 0,-202 Q38,-202 36,-162 Q30,-186 8,-188 Q-4,-178 -18,-186 Q-30,-180 -36,-162Z" fill="' + c + '"/>';
      case 'bun':
        return '<circle cx="0" cy="-204" r="13" fill="' + shade(c, -8) + '"/><path d="M-35,-163 Q-37,-200 0,-200 Q37,-200 35,-163 Q30,-183 0,-186 Q-28,-183 -35,-163Z" fill="' + c + '"/>';
      case 'side':
        return '<path d="M-35,-160 Q-38,-202 0,-201 Q38,-200 35,-162 Q32,-180 24,-186 Q-2,-176 -24,-186 Q-32,-178 -35,-160Z" fill="' + c + '"/>';
      default: // short
        return '<path d="M-35,-163 Q-37,-202 0,-201 Q37,-202 35,-163 Q30,-184 2,-186 Q-24,-186 -35,-163Z" fill="' + c + '"/>';
    }
  }
  function hairBack(style, c) {
    if (style === 'bald') return '<path d="M-34,-158 Q-34,-136 0,-134 Q34,-136 34,-158 Q20,-150 0,-150 Q-20,-150 -34,-158Z" fill="' + c + '"/>';
    let s = '<circle cx="0" cy="-167" r="34.5" fill="' + c + '"/>';
    if (style === 'long') s += '<path d="M-35,-168 Q-38,-118 -28,-110 L28,-110 Q38,-118 35,-168Z" fill="' + c + '"/>';
    if (style === 'bob') s += '<path d="M-36,-170 Q-38,-136 -28,-132 L28,-132 Q38,-136 36,-170Z" fill="' + c + '"/>';
    if (style === 'bun') s += '<circle cx="0" cy="-204" r="13" fill="' + shade(c, -8) + '"/>';
    if (style === 'pony') s += '<path d="M-8,-150 Q0,-110 8,-150Z" fill="' + c + '" stroke="' + shade(c, -20) + '"/>';
    return s;
  }

  /* ---------- 帽子類 ---------- */
  function hats(a) {
    let s = '';
    if (a.chefhat) s += '<path d="M-26,-190 L-26,-210 Q-40,-220 -26,-234 Q-14,-250 0,-238 Q14,-250 26,-234 Q40,-220 26,-210 L26,-190 Z" fill="#fff" stroke="#d9d9d9" stroke-width="2"/><rect x="-27" y="-198" width="54" height="10" fill="#f3f3f3" stroke="#d9d9d9" stroke-width="1.5"/>';
    if (a.nursecap) s += '<path d="M-20,-196 L20,-196 L16,-212 L-16,-212Z" fill="#fff" stroke="#d8dde2" stroke-width="1.5"/><path d="M-4,-208 h8 M0,-212 v8" stroke="#e05b6b" stroke-width="2"/>';
    if (a.cap) {
      const c = a.cap === true ? '#3d6fb0' : a.cap;
      s += '<path d="M-34,-178 Q-33,-208 0,-208 Q33,-208 34,-178 Z" fill="' + c + '"/><rect x="-38" y="-182" width="76" height="7" rx="3.5" fill="' + shade(c, -30) + '"/><circle cx="0" cy="-196" r="5" fill="#fff" opacity=".85"/>';
    }
    if (a.headband) {
      const c = a.headband === true ? '#ffffff' : a.headband;
      s += '<rect x="-35" y="-186" width="70" height="9" rx="3" fill="' + c + '"/><path d="M30,-184 l14,-8 l-2,12Z" fill="' + c + '"/>';
    }
    if (a.bandana) s += '<path d="M-35,-176 Q-36,-206 0,-207 Q36,-206 35,-176 Z" fill="' + a.bandana + '"/><path d="M-35,-178 L35,-178" stroke="' + shade(a.bandana, -30) + '" stroke-width="3"/>';
    if (a.bandage) s += '<path d="M-34,-180 Q0,-190 34,-180 L34,-170 Q0,-180 -34,-170Z" fill="#fff" stroke="#d6d6d6" stroke-width="1.5"/><rect x="14" y="-158" width="12" height="8" rx="2" fill="#fbeedd" stroke="#e1c9ad"/>';
    if (a.glasses) s += '<g class="fo gl"><circle cx="-12" cy="-163" r="9" fill="none" stroke="#333" stroke-width="2"/><circle cx="12" cy="-163" r="9" fill="none" stroke="#333" stroke-width="2"/><path d="M-3,-163 h6" stroke="#333" stroke-width="2"/></g>';
    if (a.headset) s += '<path d="M-36,-168 Q-36,-208 0,-208 Q36,-208 36,-168" fill="none" stroke="#333" stroke-width="3"/><rect x="-40" y="-172" width="8" height="14" rx="3" fill="#333"/><path class="fo" d="M-36,-160 Q-30,-146 -14,-146" fill="none" stroke="#333" stroke-width="2"/>';
    return s;
  }

  /* ---------- 胴体・服装 ---------- */
  function body(o, a) {
    const top = o.top || '#5b8bd0';
    const bottom = o.bottom || '#3d4a63';
    const skin = o.skin || '#f7d6bd';
    const shoe = o.shoe || '#3a3330';
    let legs = '';
    if (o.skirt) {
      const lc = o.legs || skin;
      legs += '<rect x="-15" y="-40" width="11" height="36" fill="' + lc + '"/><rect x="4" y="-40" width="11" height="36" fill="' + lc + '"/>';
      legs += '<path d="M-30,-64 L30,-64 L38,-30 L-38,-30Z" fill="' + bottom + '"/>';
    } else {
      legs += '<path d="M-29,-64 L29,-64 L26,-6 L4,-6 L0,-44 L-4,-6 L-26,-6Z" fill="' + bottom + '"/>';
    }
    legs += '<ellipse cx="-13" cy="-4" rx="13" ry="6" fill="' + shoe + '"/><ellipse cx="13" cy="-4" rx="13" ry="6" fill="' + shoe + '"/>';

    const armC = a.labcoat ? '#ffffff' : (a.happi ? a.happi : top);
    const torsoPath = 'M-30,-128 Q-38,-127 -38,-118 L-34,-58 L34,-58 L38,-118 Q38,-127 30,-128 Z';
    let t = '';
    t += '<path d="' + torsoPath + '" fill="' + top + '"/>';
    if (a.vest) t += '<path d="M-30,-128 Q-38,-127 -38,-118 L-34,-58 L-6,-58 L-8,-110 L-14,-128Z M30,-128 Q38,-127 38,-118 L34,-58 L6,-58 L8,-110 L14,-128Z" fill="' + a.vest + '"/>';
    if (a.labcoat) t += '<path d="M-31,-129 Q-40,-128 -40,-118 L-42,-40 L-6,-40 L-6,-100 L-14,-129Z M31,-129 Q40,-128 40,-118 L42,-40 L6,-40 L6,-100 L14,-129Z" fill="#fff" stroke="#d7dde3" stroke-width="1.5"/><rect class="fo" x="-34" y="-78" width="14" height="10" rx="2" fill="none" stroke="#c8d0d8" stroke-width="1.5"/>';
    if (a.happi) t += '<path d="M-31,-129 Q-40,-128 -40,-118 L-40,-56 L-5,-56 L-5,-129Z M31,-129 Q40,-128 40,-118 L40,-56 L5,-56 L5,-129Z" fill="' + a.happi + '"/><path class="fo" d="M-12,-129 L-5,-56 M12,-129 L5,-56" stroke="#fff" stroke-width="7"/>';
    if (a.collar) t += '<path class="fo" d="M-13,-129 L0,-108 L13,-129 Z" fill="#fff"/>';
    if (a.tie) t += '<path class="fo" d="M-4,-122 L4,-122 L6,-94 L0,-86 L-6,-94 Z" fill="' + a.tie + '"/><path class="fo" d="M-4,-127 L4,-127 L4,-121 L-4,-121Z" fill="' + shade(a.tie, -15) + '"/>';
    if (a.bowtie) t += '<path class="fo" d="M0,-122 L-12,-128 L-12,-116Z M0,-122 L12,-128 L12,-116Z" fill="' + a.bowtie + '"/><circle class="fo" cx="0" cy="-122" r="3" fill="' + shade(a.bowtie, -25) + '"/>';
    if (a.apron) t += '<path class="fo" d="M-20,-124 L20,-124 L22,-98 L32,-44 L-32,-44 L-22,-98Z" fill="' + a.apron + '"/><path class="fo" d="M-20,-124 L-14,-130 M20,-124 L14,-130" stroke="' + shade(a.apron, -25) + '" stroke-width="3"/><rect class="fo" x="-12" y="-86" width="24" height="14" rx="2" fill="' + shade(a.apron, -14) + '"/>';
    if (a.waistapron) t += '<path class="fo" d="M-34,-70 L34,-70 L36,-30 L-36,-30Z" fill="' + a.waistapron + '"/><rect class="fo" x="-34" y="-72" width="68" height="5" fill="' + shade(a.waistapron, -25) + '"/>';
    if (a.pearls) t += '<path class="fo" d="M-14,-127 Q0,-112 14,-127" fill="none" stroke="#f6f2ea" stroke-width="4" stroke-dasharray="0.1 5.5" stroke-linecap="round"/>';
    if (a.badge) t += '<rect class="fo" x="10" y="-114" width="18" height="10" rx="1.5" fill="#fff" stroke="#9aa3ad" stroke-width="1.2"/><path class="fo" d="M13,-109 h12" stroke="#7b8590" stroke-width="1.6"/>';
    if (a.towel) t += '<path class="fo" d="M-26,-130 Q0,-118 26,-130 L22,-96 L16,-96 L18,-120 Q0,-114 -18,-120 L-16,-96 L-22,-96Z" fill="' + (a.towel === true ? '#fff' : a.towel) + '" stroke="#dcdcdc" stroke-width="1"/>';
    if (a.backpack) t += '<path class="fo" d="M-24,-128 L-20,-70 M24,-128 L20,-70" stroke="' + a.backpack + '" stroke-width="6"/><rect class="bk" x="-28" y="-122" width="56" height="58" rx="10" fill="' + a.backpack + '"/>';
    if (a.sling) t += '<path class="fo" d="M-40,-96 L-6,-108 L-8,-84 L-40,-78Z" fill="#fff" stroke="#d6d6d6" stroke-width="1.5"/><path class="fo" d="M-6,-108 L20,-128" stroke="#fff" stroke-width="5"/>';

    // 腕（左＝画面左、右＝画面右）
    const armL = '<g class="armL"><rect x="-46" y="-124" width="13" height="58" rx="6.5" fill="' + armC + '"/><circle cx="-39.5" cy="-63" r="7.5" fill="' + skin + '"/></g>';
    const armR = '<g class="armR"><rect x="33" y="-124" width="13" height="58" rx="6.5" fill="' + armC + '"/><circle cx="39.5" cy="-63" r="7.5" fill="' + skin + '"/>' + heldItem(a) + '</g>';
    return { legs: legs, torso: t + armL + armR };
  }

  /* ---------- 手に持つもの（画面右側の手） ---------- */
  function heldItem(a) {
    if (a.bag) return '<path d="M30,-62 L58,-62 L56,-26 L32,-26Z" fill="' + a.bag + '" stroke="' + shade(a.bag, -30) + '" stroke-width="1.5"/><path d="M36,-62 Q44,-76 52,-62" fill="none" stroke="' + shade(a.bag, -40) + '" stroke-width="2"/>';
    if (a.cakebox) return '<rect x="28" y="-62" width="34" height="26" fill="#fff" stroke="#d3c4b8" stroke-width="1.5"/><path d="M45,-62 v26 M28,-50 h34" stroke="#e46a8b" stroke-width="3"/><path d="M40,-66 Q45,-60 50,-66" stroke="#e46a8b" stroke-width="3" fill="none"/>';
    if (a.bouquet) return '<path d="M34,-66 L46,-30 L52,-66Z" fill="#cde7c1" stroke="#9cc58b"/><circle cx="36" cy="-72" r="7" fill="#f28aa8"/><circle cx="48" cy="-76" r="7" fill="#ffd166"/><circle cx="54" cy="-68" r="6" fill="#ff8c69"/><circle cx="42" cy="-80" r="5" fill="#ffffff"/>';
    if (a.breadbag) return '<path d="M32,-64 L56,-64 L54,-26 L34,-26Z" fill="#d9b98a" stroke="#b6955f" stroke-width="1.5"/><rect x="38" y="-86" width="10" height="30" rx="5" fill="#c98a43" transform="rotate(12 43 -70)"/>';
    if (a.garment) return '<path d="M40,-68 l0,-6 q0,-6 5,-6" fill="none" stroke="#777" stroke-width="2"/><path d="M26,-66 L54,-66 L58,-6 L22,-6Z" fill="#ffffff" opacity=".7" stroke="#b8c7d6" stroke-width="1.5"/><path d="M30,-62 L50,-62 L52,-12 L28,-12Z" fill="#cfe3f7"/>';
    if (a.suitcase) return '<path d="M44,-62 L52,-62 L52,-40" fill="none" stroke="#555" stroke-width="3"/><rect x="38" y="-40" width="30" height="40" rx="5" fill="' + a.suitcase + '"/><path d="M46,-36 v32 M60,-36 v32" stroke="' + shade(a.suitcase, -30) + '" stroke-width="2"/>';
    if (a.carrier) return '<rect x="26" y="-60" width="38" height="28" rx="6" fill="' + a.carrier + '"/><rect x="32" y="-54" width="16" height="16" rx="2" fill="#333"/><path d="M34,-54 v16 M38,-54 v16 M42,-54 v16 M46,-54 v16" stroke="#aaa" stroke-width="1.2"/><circle cx="40" cy="-44" r="2" fill="#ffd166"/><circle cx="44" cy="-45" r="2" fill="#ffd166"/>';
    if (a.envelope) return '<rect x="30" y="-74" width="26" height="34" rx="1" fill="#c9a26b" stroke="#a7834f" stroke-width="1.5"/>';
    if (a.bookbag) return '<path d="M32,-62 L56,-62 L55,-28 L33,-28Z" fill="#f6efe2" stroke="#c9b893" stroke-width="1.5"/><text x="44" y="-40" font-size="10" text-anchor="middle" fill="#9a7f4c">本</text>';
    if (a.keys) return '<circle cx="44" cy="-56" r="5" fill="none" stroke="#c9a227" stroke-width="2.5"/><path d="M44,-51 v12 h4 M44,-44 h3" stroke="#c9a227" stroke-width="2.5" fill="none"/>';
    if (a.wallet) return '<rect x="34" y="-62" width="20" height="14" rx="2" fill="#7a4b2a"/>';
    if (a.pamphlet) return '<rect x="34" y="-76" width="18" height="26" fill="#1f2b5c" stroke="#fff" stroke-width="1.5"/><path d="M38,-64 l5,-6 l5,6Z" fill="#ffd166"/>';
    if (a.drink) return '<rect x="34" y="-72" width="12" height="20" rx="2" fill="#fff4c2" stroke="#e1cf7a"/><rect x="34" y="-66" width="12" height="6" fill="#f08a3b"/>';
    if (a.certificate) return '<rect x="30" y="-78" width="26" height="34" fill="#fffdf4" stroke="#d9c48b" stroke-width="1.5"/><circle cx="43" cy="-52" r="5" fill="#d9534f"/><path d="M35,-72 h16 M35,-67 h16 M35,-62 h10" stroke="#bbb" stroke-width="1.5"/>';
    return '';
  }

  /* ---------- 人物本体 ---------- */
  function person(o) {
    o = o || {};
    const a = parseAcc(o.acc);
    const hc = o.hairColor || '#3b2a20';
    const hs = o.hair || 'short';
    const skin = o.skin || '#f7d6bd';
    const ex = expressions(hc);
    const b = body(o, a);
    let face = '';
    Object.keys(ex).forEach(function (k) { face += '<g class="ex ex-' + k + '">' + ex[k] + '</g>'; });

    return '' +
      '<g class="ch" data-ex="' + (o.ex || 'neutral') + '" data-view="front">' +
      '<ellipse cx="0" cy="0" rx="44" ry="8" fill="#000" opacity=".13"/>' +
      '<g class="legs">' + b.legs + '</g>' +
      '<g class="torso">' + b.torso + '</g>' +
      '<g class="head">' +
        '<rect x="-7" y="-138" width="14" height="12" fill="' + shade(skin, -18) + '"/>' +
        (a.veil ? '<path d="M-30,-196 Q0,-214 30,-196 Q50,-150 44,-100 L-44,-100 Q-50,-150 -30,-196Z" fill="#fff" opacity=".8" stroke="#e6e6e6"/>' : '') +
        hairBehind(hs, hc) +
        '<circle cx="0" cy="-165" r="33" fill="' + skin + '"/>' +
        '<g class="fo face"><ellipse cx="-33" cy="-162" rx="5" ry="7" fill="' + skin + '"/><ellipse cx="33" cy="-162" rx="5" ry="7" fill="' + skin + '"/>' + hairFront(hs, hc) + face + '</g>' +
        '<g class="bk">' + hairBack(hs, hc) + '</g>' +
        hats(a) +
        '<g class="qmark"><text x="42" y="-196" font-size="40" font-weight="800" fill="#f08a24" stroke="#fff" stroke-width="3" paint-order="stroke">？</text></g>' +
        '<g class="shock"><path d="M-46,-212 l8,14 M0,-226 v16 M46,-212 l-8,14" stroke="#4a6fb5" stroke-width="4" stroke-linecap="round"/></g>' +
      '</g>' +
      '</g>';
  }

  /* ---------- ポイントカード ---------- */
  function pointCard(shopName, color) {
    const c = color || '#ff7a59';
    let s = '<g class="pcard">';
    s += '<rect x="-128" y="-80" width="256" height="160" rx="14" fill="#000" opacity=".18" transform="translate(6,8)"/>';
    s += '<rect x="-128" y="-80" width="256" height="160" rx="14" fill="#fffdf7" stroke="' + shade(c, -30) + '" stroke-width="3"/>';
    s += '<path d="M-128,-48 L-128,-66 Q-128,-80 -114,-80 L114,-80 Q128,-80 128,-66 L128,-48Z" fill="' + c + '"/>';
    s += '<text x="-112" y="-57" font-size="19" font-weight="800" fill="#fff" letter-spacing="1">POINT CARD</text>';
    s += '<text x="112" y="-58" font-size="12" font-weight="700" fill="#fff" text-anchor="end">ポイントカード</text>';
    s += '<text x="0" y="-30" font-size="13" font-weight="700" fill="#555" text-anchor="middle">' + esc(shopName) + '</text>';
    for (let r = 0; r < 2; r++) {
      for (let i = 0; i < 5; i++) {
        const x = -92 + i * 46, y = 2 + r * 42;
        s += '<circle cx="' + x + '" cy="' + y + '" r="17" fill="none" stroke="' + shade(c, -10) + '" stroke-width="2" stroke-dasharray="4 3"/>';
        s += '<text x="' + x + '" y="' + (y + 5) + '" font-size="12" fill="#c9c2b8" text-anchor="middle">' + (r * 5 + i + 1) + '</text>';
      }
    }
    // 本日分のスタンプ（1個目）
    s += '<g transform="translate(-92,2) rotate(-14)"><circle r="16" fill="none" stroke="#d9363e" stroke-width="3"/><text y="6" font-size="15" font-weight="800" fill="#d9363e" text-anchor="middle">済</text></g>';
    s += '<text x="0" y="72" font-size="10.5" fill="#888" text-anchor="middle">スタンプ10個で次回ご利用時に500円引き</text>';
    s += '</g>';
    return s;
  }

  function esc(t) {
    return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
  }

  window.Chars = { person: person, pointCard: pointCard, shade: shade, esc: esc };
})();
