/* =========================================================
 * ゲーム進行
 *   title → ask（回答受付中）→ anim（結果演出）→ ask … → result
 * ========================================================= */
(function () {
  'use strict';
  const D = window.GAME_DATA, CH = window.Chars, SC = window.Scenes, SND = window.Sound;
  const CFG = D.config;
  const $ = function (id) { return document.getElementById(id); };

  const STAFF_X = 190, CUST_X0 = 470, CUST_WALK = 180, FLOOR_Y = 410, EXIT_X = 900;
  const INPUT_LOCK_MS = 320;   // 出題直後の入力無効時間
  const PHRASE = 'またのご利用を<wbr>お待ちしております';
  const ACC_STOP_X = 590;      // 接客事故時、お客様が足を止める位置（カードに顔が隠れないように）

  /* ---------- 要素 ---------- */
  const el = {
    scene: $('scene'), bg: $('bg'), staff: $('staff'), cust: $('cust'), card: $('card'),
    bStaff: $('bStaff'), bCust: $('bCust'), verdict: $('verdict'), stamp: $('stamp'), stampNote: $('stampNote'), skip: $('skip'),
    timerBar: $('timerBar'), btnSay: $('btnSay'), btnNo: $('btnNo'),
    bizName: $('bizName'), shopName: $('shopName'), qNo: $('qNo'), qTotal: $('qTotal'), score: $('score'), mute: $('mute'),
    title: $('titleScreen'), result: $('resultScreen'), btnStart: $('btnStart'), btnRetry: $('btnRetry')
  };

  /* ---------- 補間アニメーション ---------- */
  const ease = {
    out: function (t) { return 1 - Math.pow(1 - t, 3); },
    inq: function (t) { return t * t; },
    lin: function (t) { return t; },
    back: function (t) { const c = 1.7; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); }
  };
  const tweens = [];
  function tween(obj, to, dur, fn) {
    for (let i = 0; i < tweens.length; i++) if (tweens[i].obj === obj) for (const k in to) delete tweens[i].to[k];
    const from = {};
    for (const k in to) from[k] = obj[k];
    tweens.push({ obj: obj, from: from, to: to, start: performance.now(), dur: Math.max(1, dur), ease: fn || ease.out });
  }
  function stepTweens(now) {
    for (let i = tweens.length - 1; i >= 0; i--) {
      const tw = tweens[i];
      const t = Math.min(1, (now - tw.start) / tw.dur), e = tw.ease(t);
      for (const k in tw.to) tw.obj[k] = tw.from[k] + (tw.to[k] - tw.from[k]) * e;
      if (t >= 1) tweens.splice(i, 1);
    }
  }

  /* ---------- 演出用タイマー（スキップ時に一括解除） ---------- */
  const timers = [];
  function later(ms, fn) { timers.push(setTimeout(fn, ms)); }
  function clearTimers() { while (timers.length) clearTimeout(timers.pop()); }

  /* ---------- 人物 ---------- */
  function Actor(g) { this.g = g; this.turnId = 0; }
  Actor.prototype.mount = function (svg, x) {
    this.g.innerHTML = svg;
    this.ch = this.g.querySelector('.ch');
    this.torso = this.ch.querySelector('.torso');
    this.head = this.ch.querySelector('.head');
    this.armR = this.ch.querySelector('.armR');
    this.x = x; this.y = FLOOR_Y; this.sx = 1; this.bow = 0; this.arm = 0; this.shake = 0; this.alpha = 1;
    this.walk = false; this.turnId++;
  };
  Actor.prototype.render = function (now) {
    if (!this.ch) return;
    let x = this.x, y = this.y;
    if (this.walk) y -= Math.abs(Math.sin(now / 120)) * 5;
    if (this.shake) x += Math.sin(now / 18) * this.shake;
    this.g.setAttribute('transform', 'translate(' + x.toFixed(1) + ',' + y.toFixed(1) + ') scale(' + this.sx.toFixed(3) + ',1)');
    this.g.setAttribute('opacity', this.alpha.toFixed(2));
    const s = 1 - 0.3 * this.bow;
    this.torso.setAttribute('transform', 'translate(0,-62) scale(1,' + s.toFixed(3) + ') translate(0,62)');
    // 正面から見たお辞儀：胴を縦につぶし、頭を下げて少し縦に縮める
    const hy = 66 * (1 - s) + 20 * this.bow, hs = 1 - 0.1 * this.bow;
    this.head.setAttribute('transform', 'translate(0,' + hy.toFixed(1) + ') translate(0,-132) scale(1,' + hs.toFixed(3) + ') translate(0,132)');
    this.armR.setAttribute('transform', 'rotate(' + this.arm.toFixed(1) + ' 39.5 -118)');
  };
  Actor.prototype.ex = function (name) { this.ch.setAttribute('data-ex', name); };
  Actor.prototype.turn = function (view) {
    // 振り返る：横につぶして向きを切り替える
    const self = this, id = ++this.turnId;
    tween(this, { sx: 0.12 }, 90, ease.inq);
    setTimeout(function () {
      if (self.turnId !== id) return;
      self.ch.setAttribute('data-view', view);
      tween(self, { sx: 1 }, 130, ease.out);
    }, 90);
  };
  Actor.prototype.leave = function (dur) {
    this.walk = true;
    tween(this, { x: EXIT_X }, dur || 900, ease.lin);
  };

  const staff = new Actor(el.staff), cust = new Actor(el.cust);
  const card = { x: 250, y: 300, s: 0, rot: 0, alpha: 0 };
  function renderCard() {
    el.card.setAttribute('transform', 'translate(' + card.x.toFixed(1) + ',' + card.y.toFixed(1) + ') rotate(' + card.rot.toFixed(1) + ') scale(' + Math.max(0.001, card.s).toFixed(3) + ')');
    el.card.setAttribute('opacity', card.alpha.toFixed(2));
  }

  /* ---------- 状態 ---------- */
  let phase = 'title';
  let run = null;
  let askStart = 0, limit = 4000, readyAt = 0, turnedAway = false, turnAt = 600;
  let skippable = false, overlayReadyAt = 0;
  let seenAccident = false;
  try { seenAccident = localStorage.getItem('mata-seen-accident') === '1'; } catch (e) { /* noop */ }

  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }

  // 正解パターンを偏りなく混ぜる：同じ正解は最大3連続、交互になりすぎない、序盤に「言わない」を1問は入れる
  function buildList() {
    const yes = shuffle(D.questions.filter(function (q) { return q.welcome; }));
    const no = shuffle(D.questions.filter(function (q) { return !q.welcome; }));
    const N = Math.min(CFG.total, yes.length + no.length);
    const noMin = Math.max(N - yes.length, Math.min(CFG.noMin, no.length));
    const noMax = Math.min(no.length, CFG.noMax, N);
    let pat = null;
    for (let tries = 0; tries < 2000; tries++) {
      const k = noMin + Math.floor(Math.random() * (noMax - noMin + 1));
      const p = shuffle(Array.from({ length: N }, function (_, i) { return i >= k; })); // true = 歓迎
      let runLen = 1, maxRun = 1, alt = 0;
      for (let i = 1; i < N; i++) {
        if (p[i] === p[i - 1]) { runLen++; maxRun = Math.max(maxRun, runLen); } else { runLen = 1; alt++; }
      }
      if (maxRun > 3 || alt > Math.round(N * 0.7) || alt < Math.round(N * 0.35)) continue;
      if (p.slice(0, 4).every(Boolean)) continue;
      pat = p; break;
    }
    if (!pat) pat = Array.from({ length: N }, function (_, i) { return i % 3 !== 1; });
    return pat.map(function (w) { return w ? yes.pop() : no.pop(); });
  }

  function timeLimit(i, n) {
    const t = n > 1 ? i / (n - 1) : 0;
    return Math.round(CFG.timeStart - (CFG.timeStart - CFG.timeEnd) * Math.pow(t, 1.15));
  }

  /* ---------- 表示ヘルパー ---------- */
  // html=true のときは <wbr> で改行位置を指定した従業員のセリフ（それ以外の位置では改行しない）
  function bubble(b, text, cls, html) {
    b.className = 'bubble ' + (b === el.bStaff ? 'staff' : 'cust') + (cls ? ' ' + cls : '') + (html ? ' kw' : '');
    if (html) b.innerHTML = text; else b.textContent = text;
    void b.offsetWidth;
    b.classList.add('show');
  }
  function hideBubble(b) { b.classList.remove('show'); }
  function verdict(text, cls) {
    el.verdict.className = cls || '';
    el.verdict.textContent = text;
    void el.verdict.offsetWidth;
    el.verdict.classList.add('show');
  }
  function setButtons(on) { el.btnSay.disabled = !on; el.btnNo.disabled = !on; }
  function clearPicked() { el.btnSay.classList.remove('picked'); el.btnNo.classList.remove('picked'); }

  /* ---------- 進行 ---------- */
  function startRun() {
    SND.init();
    SND.play('start');
    run = { list: buildList(), i: -1, score: 0, correct: 0, wrong: 0, timeout: 0, accident: 0, log: [] };
    el.qTotal.textContent = run.list.length;
    el.score.textContent = '0';
    el.title.classList.add('hide');
    el.result.classList.add('hide');
    nextQuestion(true);
  }

  function nextQuestion(first) {
    clearTimers();
    skippable = false;
    el.skip.classList.remove('show');
    run.i++;
    if (run.i >= run.list.length) { finish(); return; }
    phase = 'switch';
    el.scene.classList.add('fade');
    hideBubble(el.bStaff); hideBubble(el.bCust);
    el.verdict.classList.remove('show');
    later(first ? 0 : 150, setupQuestion);
  }

  function setupQuestion() {
    const q = run.list[run.i];
    tweens.length = 0;
    el.stamp.classList.remove('show');
    el.bg.innerHTML = SC.render(q.scene, q);
    staff.mount(CH.person(Object.assign({}, q.staff, { ex: 'smile' })), STAFF_X);
    cust.mount(CH.person(Object.assign({}, q.customer, { ex: q.customer.mood || 'neutral' })), CUST_X0);
    el.card.innerHTML = CH.pointCard(q.shop, q.card);
    card.x = 240; card.y = 300; card.s = 0; card.rot = 0; card.alpha = 0;

    el.bizName.textContent = q.industry;
    el.bizName.classList.remove('flash'); void el.bizName.offsetWidth; el.bizName.classList.add('flash');
    el.shopName.textContent = q.shop;
    el.qNo.textContent = run.i + 1;

    el.timerBar.style.transform = 'scaleX(1)';
    el.timerBar.classList.remove('hurry');
    clearPicked();
    el.scene.classList.remove('fade');
    bubble(el.bCust, '「' + q.line + '」');

    limit = timeLimit(run.i, run.list.length);
    turnAt = Math.min(650, limit * 0.2);
    turnedAway = false;
    askStart = performance.now();
    readyAt = askStart + INPUT_LOCK_MS;
    phase = 'ask';
    setButtons(true);
  }

  function updateAsk(now) {
    const t = now - askStart;
    const p = Math.min(1, t / limit);
    el.timerBar.style.transform = 'scaleX(' + (1 - p).toFixed(4) + ')';
    if (p > 0.7) el.timerBar.classList.add('hurry');
    if (!turnedAway && t >= turnAt) {
      // お客様が帰ろうとする
      turnedAway = true;
      cust.turn('back');
      cust.walk = true;
    }
    if (turnedAway) cust.x = CUST_X0 + CUST_WALK * Math.min(1, (t - turnAt) / (limit - turnAt));
    if (t >= limit) resolve('timeout');
  }

  function answer(choice) {
    if (phase !== 'ask' || performance.now() < readyAt) return;
    (choice === 'say' ? el.btnSay : el.btnNo).classList.add('picked');
    resolve(choice);
  }

  function resolve(choice) {
    if (phase !== 'ask') return;
    phase = 'anim';
    setButtons(false);
    const q = run.list[run.i];
    const elapsed = performance.now() - askStart;
    let kind;
    if (choice === 'timeout') kind = 'timeout';
    else if (choice === 'say') kind = q.welcome ? 'goodSay' : 'accident';
    else kind = q.welcome ? 'missNo' : 'goodNo';

    let gain = 0;
    if (kind === 'goodSay' || kind === 'goodNo') {
      gain = 100 + Math.round(50 * Math.max(0, 1 - elapsed / limit));
      run.correct++; run.score += gain;
      el.score.textContent = run.score;
    } else if (kind === 'timeout') {
      run.timeout++;
    } else {
      run.wrong++;
      if (kind === 'accident') { run.accident++; run.log.push({ q: q, kind: kind }); }
      else run.log.push({ q: q, kind: kind });
    }
    ANIM[kind](q, gain);
  }

  /* ---------- 結果演出 ---------- */
  const ANIM = {
    // A. 正しく言う：お辞儀、お客様は笑顔で帰る
    goodSay: function (q, gain) {
      SND.play('bow');
      bubble(el.bStaff, PHRASE, '', true);
      staff.ex('happy');
      tween(staff, { bow: 1 }, 240);
      cust.walk = false;
      cust.turn('front');
      cust.ex('happy');
      verdict('◎ 適切な接客　+' + gain, 'ok');
      later(700, function () { tween(staff, { bow: 0 }, 260); cust.turn('back'); });
      later(820, function () { cust.leave(700); });
      later(1500, function () { nextQuestion(); });
    },
    // B. 正しく言わない：静かに会釈、お客様は帰っていく
    goodNo: function (q, gain) {
      SND.play('nod');
      staff.ex('relieved');
      tween(staff, { bow: 0.45 }, 220);
      hideBubble(el.bCust);
      cust.leave(950);
      verdict('◎ 静かにお見送り　+' + gain, 'ok');
      later(560, function () { tween(staff, { bow: 0 }, 260); staff.ex('smile'); });
      later(1250, function () { nextQuestion(); });
    },
    // C. 言うべきところで言わない：「あれ？」
    missNo: function (q) {
      staff.ex('relieved');
      tween(staff, { bow: 0.45 }, 220);
      cust.walk = false;
      later(220, function () {
        SND.play('miss');
        cust.turn('front');
        cust.ex('puzzled');
        cust.ch.classList.add('q');
        tween(staff, { bow: 0 }, 260); staff.ex('smile');
      });
      verdict('△ ちょっと残念……ぜひまた来てほしいお店でした', 'meh');
      later(1250, function () { cust.ch.classList.remove('q'); cust.turn('back'); });
      later(1380, function () { cust.leave(750); });
      later(2050, function () { nextQuestion(); });
    },
    // E. 時間切れ：従業員は何も言わず、お客様はそのまま帰る
    timeout: function () {
      SND.play('timeout');
      hideBubble(el.bCust);
      cust.leave(650);
      verdict('… 時間切れ　お客様はお帰りになりました', 'to');
      later(1150, function () { nextQuestion(); });
    },
    // D. 接客事故：言ってはいけない店で言い、さらにポイントカードを差し出す
    accident: function (q) {
      const canSkip = seenAccident;
      // 1. 満面の笑みで決まり文句
      SND.play('cheerful');
      staff.ex('bigsmile');
      bubble(el.bStaff, PHRASE + '！', 'loud', true);
      tween(staff, { bow: 0.5 }, 220);
      // お客様は数歩進んだところで足を止める
      if (cust.x < ACC_STOP_X) {
        cust.walk = true;
        tween(cust, { x: ACC_STOP_X }, Math.min(520, (ACC_STOP_X - cust.x) * 4), ease.out);
        later(Math.min(520, (ACC_STOP_X - cust.x) * 4), function () { cust.walk = false; });
      } else {
        cust.walk = false;
      }
      later(560, function () { tween(staff, { bow: 0 }, 240); });
      // 2. お客様が足を止め、無言で振り返る
      later(800, function () { cust.turn('front'); cust.ex('neutral'); });
      // 3. 一瞬の沈黙
      later(1100, function () { bubble(el.bCust, '……', 'silent'); });
      if (canSkip) later(900, function () { skippable = true; el.skip.classList.add('show'); });
      // 4–5. 追い打ち「ポイントカードもございます！」とカード提示
      later(2050, function () {
        SND.play('card');
        bubble(el.bStaff, 'ポイントカードも<wbr>ございます！', 'loud', true);
        staff.ex('bigsmile');
        tween(staff, { arm: -62 }, 200);
        card.x = 245; card.y = 330; card.s = 0.15; card.rot = 10; card.alpha = 1;
        tween(card, { x: 330, y: 215, s: 1, rot: -6 }, 360, ease.back);
      });
      // 6. お客様の表情が凍りつく
      later(2550, function () {
        SND.play('freeze');
        cust.ex('frozen');
        cust.ch.classList.add('shocked');
        cust.shake = 2.2;
      });
      later(3000, function () { cust.shake = 0; });
      // 7. 「接客事故！」
      later(3050, function () {
        SND.play('stamp');
        el.stampNote.textContent = q.note || '';
        el.stamp.classList.remove('show'); void el.stamp.offsetWidth; el.stamp.classList.add('show');
        if (!seenAccident) {
          seenAccident = true;
          try { localStorage.setItem('mata-seen-accident', '1'); } catch (e) { /* noop */ }
        }
      });
      // 8. お客様が去り、次の問題へ
      later(4700, function () {
        tween(card, { s: 0.2, alpha: 0, x: 260, y: 320 }, 260, ease.inq);
        tween(staff, { arm: 0 }, 260);
        cust.ch.classList.remove('shocked');
        hideBubble(el.bCust);
        cust.turn('back');
      });
      later(4850, function () { cust.leave(1000); });
      later(5800, function () { nextQuestion(); });
    }
  };

  function skipAccident() {
    if (phase !== 'anim' || !skippable) return;
    nextQuestion();
  }

  /* ---------- 結果画面 ---------- */
  function finish() {
    phase = 'result';
    setButtons(false);
    const r = { total: run.list.length, correct: run.correct, wrong: run.wrong, timeout: run.timeout, accident: run.accident, score: run.score };
    const rating = D.ratings.find(function (x) { return x.test(r); });
    $('rRank').textContent = rating.rank;
    $('rComment').textContent = rating.comment;
    $('rCorrect').textContent = r.correct + ' / ' + r.total;
    $('rWrong').textContent = r.wrong;
    $('rTimeout').textContent = r.timeout;
    $('rAccident').textContent = r.accident;
    $('rScore').textContent = r.score;
    const ul = $('rLog'), wrap = $('rLogWrap');
    ul.innerHTML = '';
    const acc = run.log.filter(function (x) { return x.kind === 'accident'; });
    if (acc.length) {
      wrap.classList.remove('none');
      wrap.querySelector('.log-title').textContent = '接客事故の記録';
      acc.forEach(function (x) {
        const li = document.createElement('li');
        li.innerHTML = '<b></b><span></span>';
        li.querySelector('b').textContent = x.q.industry;
        li.querySelector('span').textContent = x.q.note || '';
        ul.appendChild(li);
      });
    } else {
      wrap.classList.add('none');
      wrap.querySelector('.log-title').textContent = '接客事故の記録：なし';
      const li = document.createElement('li');
      li.textContent = 'ポイントカードは一枚も配られませんでした。';
      ul.appendChild(li);
    }
    setTimeout(function () {
      SND.play('result');
      el.result.classList.remove('hide');
      overlayReadyAt = performance.now() + 500;
    }, 350);
  }

  /* ---------- タイトル画面の絵 ---------- */
  function drawTitleArt() {
    const svg = $('titleArt');
    const p = CH.person({ top: '#2b3e5c', bottom: '#2b3e5c', acc: ['collar', 'tie:#ff8a3d', 'badge'], hair: 'side', hairColor: '#2b2b2b', ex: 'bigsmile' });
    const c = CH.person({ top: '#1d1d21', bottom: '#1d1d21', skirt: true, legs: '#2a2a2e', acc: ['pearls'], hair: 'bob', hairColor: '#3a2a20', ex: 'frozen' });
    svg.innerHTML =
      '<rect x="0" y="0" width="520" height="250" rx="16" fill="#f4f8fb"/>' +
      '<rect x="0" y="206" width="520" height="44" fill="#e3eaf0"/>' +
      '<g transform="translate(130,236) scale(.9)">' + p + '</g>' +
      '<g transform="translate(400,236) scale(.9)">' + c + '</g>' +
      '<g transform="translate(262,118) rotate(-6) scale(.5)">' + CH.pointCard('あなたのお店', '#ff8a3d') + '</g>';
    const pc = svg.querySelectorAll('.ch');
    pc[0].querySelector('.armR').setAttribute('transform', 'rotate(-62 39.5 -118)');
    pc[1].classList.add('shocked');
  }

  /* ---------- 入力 ---------- */
  el.btnSay.addEventListener('click', function () { this.blur(); answer('say'); });
  el.btnNo.addEventListener('click', function () { this.blur(); answer('no'); });
  el.btnStart.addEventListener('click', function () { this.blur(); startRun(); });
  el.btnRetry.addEventListener('click', function () {
    this.blur();
    if (performance.now() < overlayReadyAt) return;
    startRun();
  });
  $('sceneWrap').addEventListener('pointerdown', skipAccident);

  document.addEventListener('keydown', function (e) {
    if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key;
    if (phase === 'title' || phase === 'result') {
      if ((k === 'Enter' || k === ' ') && (phase === 'title' || performance.now() >= overlayReadyAt)) { e.preventDefault(); startRun(); }
      return;
    }
    if (phase === 'anim' && skippable) { e.preventDefault(); skipAccident(); return; }
    if (k === 'ArrowLeft' || k === 'a' || k === 'A') { e.preventDefault(); answer('say'); }
    else if (k === 'ArrowRight' || k === 'd' || k === 'D') { e.preventDefault(); answer('no'); }
  });

  const muteBtns = [el.mute, $('muteTitle')];
  function syncMute() {
    const m = SND.isMuted();
    muteBtns.forEach(function (b) {
      b.textContent = m ? '♪ OFF' : '♪ ON';
      b.classList.toggle('off', m);
    });
  }
  muteBtns.forEach(function (b) {
    b.addEventListener('click', function () { this.blur(); SND.setMuted(!SND.isMuted()); syncMute(); });
  });
  syncMute();

  /* ---------- メインループ ---------- */
  function frame(now) {
    stepTweens(now);
    if (phase === 'ask') updateAsk(now);
    staff.render(now);
    cust.render(now);
    renderCard();
    requestAnimationFrame(frame);
  }

  // 初期表示：タイトルの背後に最初の店を見せておく
  (function init() {
    drawTitleArt();
    const q = D.questions[0];
    el.bg.innerHTML = SC.render(q.scene, q);
    staff.mount(CH.person(Object.assign({}, q.staff, { ex: 'smile' })), STAFF_X);
    cust.mount(CH.person(Object.assign({}, q.customer, { ex: q.customer.mood })), CUST_X0);
    el.qTotal.textContent = Math.min(CFG.total, D.questions.length);
    requestAnimationFrame(frame);
  })();

  // デバッグ・動作確認用
  window.__game = { state: function () { return { phase: phase, run: run, limit: limit }; }, buildList: buildList };
})();
