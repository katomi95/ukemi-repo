/* =========================================================
 * 問題データ
 *   welcome : true  … 再来店を歓迎する業種（正解は「またのご利用をお待ちしております」）
 *             false … 再来店を望まない業種（正解は「言わない」）
 *   scene   : scenes.js の背景キー
 *   staff / customer : chars.js の person() に渡す見た目
 *     acc は "名前" または "名前:色" の配列
 *     customer.mood は帰り際の基本表情（neutral / smile / happy / relieved / tired / sad）
 *   note    : 不正解時・結果画面に出す一言解説
 *   card    : ポイントカードの色
 * 問題を増やすときは、この配列に1件追加するだけでよい。
 * ========================================================= */
(function () {
  'use strict';

  /* よく使う服装 */
  const W = {
    suit: function (c, tie) { return { top: c || '#2b2f3a', bottom: c || '#2b2f3a', acc: ['collar', 'tie:' + (tie || '#3a4a6b'), 'badge'] }; },
    csuit: function (c, tie) { return { top: c, bottom: c, acc: ['collar', 'tie:' + tie] }; },
    worker: function (c) { return { top: c, bottom: c, shoe: '#222', acc: ['cap:' + c, 'badge'] }; },
    doctor: function () { return { top: '#8fc3d8', bottom: '#6aa3bd', acc: ['labcoat', 'badge'] }; },
    nurse: function (c) { return { top: c || '#7cb7d8', bottom: c || '#7cb7d8', shoe: '#fff', acc: ['badge'] }; },
    apron: function (top, ap, bottom) { return { top: top, bottom: bottom || '#3d3d45', acc: ['apron:' + ap, 'badge'] }; }
  };
  function st(base, extra) {
    const o = Object.assign({}, base, extra || {});
    o.acc = (base.acc || []).concat((extra && extra.acc) || []);
    return o;
  }

  const questions = [
    /* ----- 再来店を望まない業種（必須） ----- */
    { id: 'funeral', industry: '葬儀社', shop: 'やすらぎ典礼会館', welcome: false, scene: 'funeral', card: '#7a7f8c',
      line: '本日は父がお世話になりました',
      staff: st(W.suit('#23252b', '#111'), { hair: 'short', hairColor: '#222' }),
      customer: { top: '#1d1d21', bottom: '#1d1d21', skirt: true, legs: '#2a2a2e', acc: ['pearls'], hair: 'bob', hairColor: '#3a2a20', mood: 'sad' },
      note: '葬儀社の「また」は、どなたかとのお別れを意味します。' },
    { id: 'er', industry: '救急外来', shop: '市民総合病院', welcome: false, scene: 'er', card: '#4aa3c8',
      line: 'いやあ、死ぬかと思いました',
      staff: st(W.nurse('#7cb7d8'), { hair: 'pony', hairColor: '#2b1d14' }),
      customer: { top: '#9aa7b4', bottom: '#4d5563', acc: ['bandage', 'sling'], hair: 'short', hairColor: '#4a3626', mood: 'tired' },
      note: '救急外来にまた来るということは、また何かが起きたということです。' },
    { id: 'locksmith', industry: '鍵の緊急開錠', shop: 'カギの24時間かけつけ隊', welcome: false, scene: 'locksmith', card: '#d6b44a',
      line: 'もう二度と鍵なくさないようにします',
      staff: st(W.worker('#2f5d8c'), { hair: 'short', hairColor: '#222' }),
      customer: { top: '#e9c46a', bottom: '#3d4a63', acc: ['keys'], hair: 'long', hairColor: '#5a3b26', mood: 'relieved' },
      note: 'ご本人が「二度と」とおっしゃっています。' },
    { id: 'pest', industry: '害虫駆除', shop: 'クリーンホーム害虫センター', welcome: false, scene: 'pest', card: '#5a9a52',
      line: 'これで二度とゴキブリ見なくて済みますよね？',
      staff: st(W.worker('#4f8a4a'), { hair: 'short', hairColor: '#333' }),
      customer: { top: '#f2a3b3', bottom: '#6b7a8f', acc: ['apron:#ffffff'], hair: 'bun', hairColor: '#3b2a20', mood: 'tired' },
      note: '次のご依頼は、次の1匹が出たときです。' },
    { id: 'datarecovery', industry: 'データ復旧業者', shop: 'デジタルレスキューラボ', welcome: false, scene: 'datarecovery', card: '#3f6fb5',
      line: 'バックアップの大切さ、身に染みました',
      staff: st({ top: '#e9eef3', bottom: '#4a5563', acc: ['labcoat', 'glasses', 'badge'] }, { hair: 'side', hairColor: '#2b2b2b' }),
      customer: st(W.csuit('#5a6b80', '#c94f4f'), { acc: ['envelope'], hair: 'short', hairColor: '#2b1d14', mood: 'tired' }),
      note: '再来店は、データがまた消えたときです。' },
    { id: 'divorce', industry: '離婚相談所', shop: 'ひだまり離婚相談室', welcome: false, scene: 'divorce', card: '#c9a26b',
      line: 'もう結婚はこりごりです',
      staff: st(W.suit('#6b5d4f', '#c9a26b'), { hair: 'bob', hairColor: '#4a3020', skirt: true, legs: '#e8c9b0' }),
      customer: { top: '#8fa4b8', bottom: '#3d4a63', acc: ['bag:#a87b52'], hair: 'side', hairColor: '#2b1d14', mood: 'tired' },
      note: '再利用には、まず再婚が必要になります。' },
    { id: 'tow', industry: '事故車レッカー', shop: '24hロードサービス', welcome: false, scene: 'tow', card: '#f1b434',
      line: '次は安全運転します',
      staff: st(W.worker('#e08a1e'), { hair: 'short', hairColor: '#222' }),
      customer: { top: '#5b8bd0', bottom: '#3d4a63', acc: ['bandage'], hair: 'spiky', hairColor: '#3b2a20', mood: 'tired' },
      note: '次のご利用は、次の事故のときです。' },
    { id: 'estate', industry: '遺品整理', shop: 'こころ遺品整理サービス', welcome: false, scene: 'estate', card: '#8a7458',
      line: '……ありがとうございました',
      staff: st({ top: '#5f7d6a', bottom: '#5f7d6a', acc: ['badge', 'headband:#ffffff'] }, { hair: 'short', hairColor: '#333' }),
      customer: { top: '#5a5a62', bottom: '#3a3a42', acc: ['certificate'], hair: 'bald', hairColor: '#9a9a9a', mood: 'sad' },
      note: '遺品整理の「また」は、あまりにも重すぎます。' },

    /* ----- 再来店を望まない業種（追加） ----- */
    { id: 'detective', industry: '探偵事務所（浮気調査）', shop: '灯台探偵事務所', welcome: false, scene: 'detective', card: '#6b5d4a',
      line: 'やっぱり、そういうことだったんですね',
      staff: st(W.suit('#4a4038', '#6b2a2a'), { hair: 'short', hairColor: '#2b2b2b', acc: ['glasses'] }),
      customer: { top: '#b28dff', bottom: '#4d4466', skirt: true, acc: ['envelope'], hair: 'long', hairColor: '#2b1d14', mood: 'sad' },
      note: '次のご依頼は、次の疑惑です。' },
    { id: 'nightvet', industry: '夜間救急動物病院', shop: 'みどり夜間どうぶつ救急', welcome: false, scene: 'nightvet', card: '#f2a65a',
      line: 'うちの子、助かって本当によかった……',
      staff: st(W.nurse('#7fbf9f'), { hair: 'bun', hairColor: '#3b2a20' }),
      customer: { top: '#6c7a89', bottom: '#2f3640', acc: ['carrier:#e07a3f'], hair: 'side', hairColor: '#3b2a20', mood: 'relieved' },
      note: '夜中にペットを抱えて駆け込む日は、二度と来ないほうが幸せです。' },
    { id: 'plumber', industry: '水漏れ修理', shop: '水まわり緊急センター', welcome: false, scene: 'plumber', card: '#3d6fb0',
      line: '床が水浸しになったときは、どうなるかと',
      staff: st(W.worker('#3d6fb0'), { hair: 'short', hairColor: '#222' }),
      customer: { top: '#e9e4da', bottom: '#5b6b7a', acc: ['towel:#9fd0ff'], hair: 'bob', hairColor: '#4a3020', mood: 'tired' },
      note: 'また来るときは、また水浸しのときです。' },
    { id: 'debt', industry: '債務整理（法律事務所）', shop: 'あおば法律事務所', welcome: false, scene: 'debt', card: '#2b3e5c',
      line: 'これで、借金生活から抜け出せます',
      staff: st(W.suit('#2b3e5c', '#8a2a2a'), { hair: 'side', hairColor: '#2b2b2b', acc: ['glasses'] }),
      customer: { top: '#9aa7b4', bottom: '#4d5563', acc: ['envelope'], hair: 'short', hairColor: '#3b2a20', mood: 'relieved' },
      note: '二度目の債務整理は、だいぶ大変です。' },
    { id: 'wedding', industry: '結婚式場', shop: 'しらさぎガーデンチャペル', welcome: false, scene: 'wedding', card: '#e9cf6a',
      line: '一生の思い出になりました',
      staff: st(W.suit('#2b2b33', '#e9cf6a'), { hair: 'short', hairColor: '#222', acc: ['headset'] }),
      customer: { top: '#ffffff', bottom: '#ffffff', skirt: true, legs: '#fff', acc: ['veil', 'bouquet'], hair: 'bun', hairColor: '#3b2a20', mood: 'happy' },
      note: 'ご本人いわく「一生の」思い出です。二度目は想定していません。' },
    { id: 'nosmoke', industry: '禁煙外来', shop: 'みなと内科', welcome: false, scene: 'nosmoke', card: '#2f8f83',
      line: '今度こそ、タバコとはお別れです',
      staff: st(W.doctor(), { hair: 'short', hairColor: '#555' }),
      customer: { top: '#7a8a99', bottom: '#3d4a63', acc: [], hair: 'short', hairColor: '#4a3626', mood: 'relieved' },
      note: 'また来院したら、また吸ってしまったということです。' },
    { id: 'glass', industry: 'ガラス修理（空き巣被害）', shop: '街のガラス屋さん', welcome: false, scene: 'glass', card: '#4b7f9e',
      line: '空き巣なんて、もうこりごりです',
      staff: st(W.worker('#4b7f9e'), { hair: 'short', hairColor: '#333' }),
      customer: { top: '#c9a26b', bottom: '#5b6b7a', skirt: true, acc: [], hair: 'long', hairColor: '#4a3020', mood: 'tired' },
      note: '次のご依頼は、次の空き巣被害です。' },
    { id: 'yobiko', industry: '予備校', shop: '未来ゼミナール', welcome: false, scene: 'yobiko', card: '#d6303a',
      line: 'おかげさまで、第一志望に合格しました！',
      staff: st(W.suit('#3a4a6b', '#d6303a'), { hair: 'side', hairColor: '#222' }),
      customer: { top: '#2b3e5c', bottom: '#2b3e5c', acc: ['collar', 'backpack:#3f6fb5'], hair: 'short', hairColor: '#222', mood: 'happy' },
      note: '合格した受験生がまた来たら、それは浪人です。' },
    { id: 'konkatsu', industry: '結婚相談所', shop: 'ご縁むすび結婚相談所', welcome: false, scene: 'konkatsu', card: '#e66a82',
      line: 'おかげさまで、成婚退会です！',
      staff: st(W.suit('#e66a82', '#ffffff'), { hair: 'long', hairColor: '#4a3020', skirt: true, legs: '#f2d0bb' }),
      customer: st(W.csuit('#3a4a6b', '#e66a82'), { acc: ['bouquet'], hair: 'side', hairColor: '#2b1d14', mood: 'happy' }),
      note: '成婚退会した方がまた入会するのは、つまりそういうことです。' },
    { id: 'ortho', industry: '整形外科（骨折）', shop: 'さくら整形外科', welcome: false, scene: 'ortho', card: '#3d6fb0',
      line: 'ギプス、やっと取れました！',
      staff: st(W.doctor(), { hair: 'side', hairColor: '#2b2b2b', acc: ['glasses'] }),
      customer: { top: '#f07b2e', bottom: '#3d4a63', acc: ['bag:#5b8bd0'], hair: 'spiky', hairColor: '#3b2a20', mood: 'happy' },
      note: 'また来るのは、また骨を折ったときです。' },
    { id: 'lostfound', industry: '駅の忘れ物センター', shop: '中央駅 お忘れ物承り所', welcome: false, scene: 'lostfound', card: '#2b3e5c',
      line: '財布、見つかってよかったです……',
      staff: st(W.suit('#2b3e5c', '#c0392b'), { hair: 'short', hairColor: '#222', acc: ['cap:#2b3e5c'] }),
      customer: { top: '#7fbf7f', bottom: '#4d5563', acc: ['wallet'], hair: 'bob', hairColor: '#3b2a20', mood: 'relieved' },
      note: '次のご来所は、次に何かをなくしたときです。' },

    /* ----- 再来店を歓迎する業種（必須） ----- */
    { id: 'salon', industry: '美容院', shop: 'ヘアサロン ルミエ', welcome: true, scene: 'salon', card: '#d97a8b',
      line: 'さっぱりしました。ありがとうございました',
      staff: st({ top: '#2b2b2b', bottom: '#2b2b2b', acc: ['waistapron:#555', 'badge'] }, { hair: 'side', hairColor: '#8a5a3a' }),
      customer: { top: '#f2c14e', bottom: '#5b6b7a', skirt: true, acc: ['bag:#d97a8b'], hair: 'bob', hairColor: '#6b3e26', mood: 'happy' } },
    { id: 'barber', industry: '理容室', shop: 'バーバー三丁目', welcome: true, scene: 'barber', card: '#2952a3',
      line: '顔そりまでしてもらって、気持ちよかったです',
      staff: st({ top: '#ffffff', bottom: '#3d4a63', acc: ['collar', 'bowtie:#2952a3', 'badge'] }, { hair: 'short', hairColor: '#555' }),
      customer: { top: '#6ca3c9', bottom: '#3d4a63', acc: [], hair: 'short', hairColor: '#222', mood: 'happy' } },
    { id: 'restaurant', industry: 'レストラン', shop: '洋食グリル やまねこ亭', welcome: true, scene: 'restaurant', card: '#8c3b2e',
      line: 'とてもおいしかったです',
      staff: st({ top: '#ffffff', bottom: '#222', acc: ['vest:#222', 'bowtie:#8c3b2e', 'badge'] }, { hair: 'short', hairColor: '#222' }),
      customer: { top: '#e66a82', bottom: '#3d3d55', skirt: true, acc: ['bag:#f2c14e'], hair: 'long', hairColor: '#3b2a20', mood: 'happy' } },
    { id: 'cafe', industry: '喫茶店', shop: '純喫茶 こもれび', welcome: true, scene: 'cafe', card: '#7a5539',
      line: 'コーヒー、ごちそうさまでした',
      staff: st(W.apron('#ffffff', '#6b4226'), { hair: 'side', hairColor: '#999', acc: ['bowtie:#6b4226'] }),
      customer: { top: '#7fbf7f', bottom: '#5b6b7a', acc: ['bookbag'], hair: 'short', hairColor: '#3b2a20', mood: 'happy' } },
    { id: 'bakery', industry: 'パン屋', shop: 'ベーカリー小麦堂', welcome: true, scene: 'bakery', card: '#c4782f',
      line: '焼きたてのうちに食べますね',
      staff: st(W.apron('#ffffff', '#c4782f'), { hair: 'short', hairColor: '#3b2a20', acc: ['chefhat'] }),
      customer: { top: '#6ca3c9', bottom: '#3d4a63', skirt: true, acc: ['breadbag'], hair: 'pony', hairColor: '#3b2a20', mood: 'happy' } },
    { id: 'bookstore', industry: '書店', shop: 'ひかり書店', welcome: true, scene: 'bookstore', card: '#3f6b4f',
      line: '続きが出たらまた来ます',
      staff: st(W.apron('#f2efe6', '#3f6b4f'), { hair: 'bob', hairColor: '#2b1d14', acc: ['glasses'] }),
      customer: { top: '#3f6fb5', bottom: '#2b2b33', acc: ['bookbag', 'glasses'], hair: 'spiky', hairColor: '#222', mood: 'happy' } },
    { id: 'cleaning', industry: 'クリーニング店', shop: 'せせらぎクリーニング', welcome: true, scene: 'cleaning', card: '#3a8dc5',
      line: '来週もワイシャツお願いしますね',
      staff: st(W.apron('#ffffff', '#3a8dc5'), { hair: 'bun', hairColor: '#4a3020' }),
      customer: st(W.csuit('#4d5563', '#3a8dc5'), { acc: ['garment'], hair: 'short', hairColor: '#222', mood: 'smile' }) },
    { id: 'cinema', industry: '映画館', shop: 'シネマ銀河座', welcome: true, scene: 'cinema', card: '#d4af37',
      line: '面白かったー！続編も観に来ます',
      staff: st({ top: '#ffffff', bottom: '#222', acc: ['vest:#8a2232', 'bowtie:#222', 'badge'] }, { hair: 'pony', hairColor: '#3b2a20' }),
      customer: { top: '#2e7a4f', bottom: '#2b2b33', acc: ['pamphlet'], hair: 'spiky', hairColor: '#3b2a20', mood: 'happy' } },
    { id: 'hotel', industry: 'ホテル', shop: 'ホテル・ブルーベイ', welcome: true, scene: 'hotel', card: '#2b3e5c',
      line: '快適に過ごせました。お世話になりました',
      staff: st(W.suit('#2b3e5c', '#d4af37'), { hair: 'side', hairColor: '#222' }),
      customer: { top: '#f2e6c8', bottom: '#6b5d4a', acc: ['suitcase:#3a6a8f'], hair: 'long', hairColor: '#6b3e26', mood: 'happy' } },
    { id: 'patisserie', industry: '洋菓子店', shop: 'パティスリー・ミエル', welcome: true, scene: 'patisserie', card: '#e66a82',
      line: '誕生日ケーキ、子どもが喜びます',
      staff: st(W.apron('#ffffff', '#f2b8c6'), { hair: 'bun', hairColor: '#4a3020', acc: ['chefhat'] }),
      customer: { top: '#6ca3c9', bottom: '#3d4a63', acc: ['cakebox'], hair: 'short', hairColor: '#3b2a20', mood: 'happy' } },
    { id: 'florist', industry: '花屋', shop: 'フラワーショップ花ことば', welcome: true, scene: 'florist', card: '#5a9a52',
      line: '部屋が明るくなりそうです',
      staff: st(W.apron('#f2efe6', '#5a9a52'), { hair: 'pony', hairColor: '#6b3e26' }),
      customer: { top: '#f2c14e', bottom: '#5b6b7a', skirt: true, acc: ['bouquet'], hair: 'bob', hairColor: '#2b1d14', mood: 'happy' } },
    { id: 'onsen', industry: '温泉施設', shop: '湯の郷 ほっこり', welcome: true, scene: 'onsen', card: '#2f4f8f',
      line: 'いいお湯でした〜',
      staff: st({ top: '#2f4f8f', bottom: '#2b2b33', acc: ['happi:#2f4f8f', 'headband:#ffffff', 'badge'] }, { hair: 'short', hairColor: '#222' }),
      customer: { top: '#e9e4da', bottom: '#6b7a8f', acc: ['towel', 'drink'], hair: 'short', hairColor: '#555', mood: 'relieved' } },

    /* ----- 再来店を歓迎する業種（追加） ----- */
    { id: 'dentist', industry: '歯科医院（定期検診）', shop: 'しろくま歯科', welcome: true, scene: 'dentist', card: '#4aa3c8',
      line: '虫歯ゼロでした！半年後もお願いします',
      staff: st(W.nurse('#f2b8c6'), { hair: 'bun', hairColor: '#3b2a20' }),
      customer: { top: '#7fbf7f', bottom: '#3d4a63', acc: ['bag:#ffffff'], hair: 'side', hairColor: '#3b2a20', mood: 'happy' },
      note: '病院でも、定期検診は通い続けるのが正解です。' },
    { id: 'blood', industry: '献血ルーム', shop: '献血ルーム ひまわり', welcome: true, scene: 'blood', card: '#e84a5a',
      line: '少しでもお役に立てたならうれしいです',
      staff: st(W.nurse('#f2b8c6'), { hair: 'pony', hairColor: '#2b1d14' }),
      customer: { top: '#5b8bd0', bottom: '#3d4a63', acc: ['drink'], hair: 'spiky', hairColor: '#222', mood: 'smile' },
      note: '献血は、ぜひまた来ていただきたいものです。' },
    { id: 'konbini', industry: 'コンビニ', shop: 'ハッピーマート二丁目店', welcome: true, scene: 'konbini', card: '#2e9e57',
      line: 'あ、レシートは大丈夫です',
      staff: st({ top: '#7fbf9f', bottom: '#3d4a63', acc: ['vest:#2e9e57', 'badge'] }, { hair: 'spiky', hairColor: '#6b3e26' }),
      customer: { top: '#4d5563', bottom: '#2b2b33', acc: ['bag:#ffffff'], hair: 'short', hairColor: '#222', mood: 'neutral' } },
    { id: 'gym', industry: 'スポーツジム', shop: 'フィットネス ぐんぐん', welcome: true, scene: 'gym', card: '#f07b2e',
      line: '明日も来ます。筋肉痛でも',
      staff: st({ top: '#f07b2e', bottom: '#2b2b33', acc: ['badge'] }, { hair: 'short', hairColor: '#222' }),
      customer: { top: '#5b8bd0', bottom: '#2b2b33', acc: ['towel', 'bag:#333333'], hair: 'pony', hairColor: '#3b2a20', mood: 'tired' } },
    { id: 'seitai', industry: '整体院', shop: 'ほぐし処 ゆるり', welcome: true, scene: 'seitai', card: '#7a8f5a',
      line: '肩がウソみたいに軽いです',
      staff: st({ top: '#7a8f5a', bottom: '#4a4a3a', acc: ['badge'] }, { hair: 'short', hairColor: '#333' }),
      customer: st(W.csuit('#5a6b80', '#a8432e'), { acc: ['bag:#5c4128'], hair: 'bald', hairColor: '#777', mood: 'relieved' }) },
    { id: 'ramen', industry: 'ラーメン店', shop: '中華そば 一番星', welcome: true, scene: 'ramen', card: '#d6303a',
      line: 'スープまで全部飲んじゃいました',
      staff: st({ top: '#222', bottom: '#222', acc: ['bandana:#d6303a', 'waistapron:#555'] }, { hair: 'short', hairColor: '#222' }),
      customer: st(W.csuit('#3a4a6b', '#c9a227'), { hair: 'short', hairColor: '#3b2a20', mood: 'happy' }) },
    { id: 'karaoke', industry: 'カラオケ', shop: 'カラオケ ルンルン', welcome: true, scene: 'karaoke', card: '#ff6fd8',
      line: '歌いすぎて、声ガラガラです',
      staff: st({ top: '#ff6fd8', bottom: '#2b2b33', acc: ['badge'] }, { hair: 'bob', hairColor: '#6b3e26' }),
      customer: { top: '#f2c14e', bottom: '#3d4a63', skirt: true, acc: ['bag:#b28dff'], hair: 'long', hairColor: '#2b1d14', mood: 'happy' } },
    { id: 'vetcheck', industry: '動物病院（予防接種）', shop: 'みどり動物病院', welcome: true, scene: 'vetcheck', card: '#4fa36b',
      line: '来年のワクチンもお願いしますね',
      staff: st(W.nurse('#7fbf9f'), { hair: 'bob', hairColor: '#3b2a20' }),
      customer: { top: '#e07a3f', bottom: '#3d4a63', acc: ['carrier:#6ca3c9'], hair: 'bun', hairColor: '#555', mood: 'smile' },
      note: '夜間救急と違って、予防接種は毎年来ていただくのが正解です。' }
  ];

  window.GAME_DATA = {
    questions: questions,
    config: {
      total: 20,          // 1プレイの問題数
      timeStart: 4200,    // 最初の制限時間(ms)
      timeEnd: 2000,      // 最後の制限時間(ms)
      noMin: 8,           // 「言わない」が正解の問題数（最小）
      noMax: 11           // 同（最大）
    },
    // 最終評価（上から順に判定）
    ratings: [
      { test: function (r) { return r.correct === r.total; }, rank: '接客の鑑', comment: '接客の鑑です。決まり文句を言わない勇気も、立派な接客です。' },
      { test: function (r) { return r.accident >= 6; }, rank: 'ポイントカード没収', comment: 'ポイントカードの配布を禁止します。' },
      { test: function (r) { return r.accident >= 3; }, rank: '伝説の従業員', comment: 'お客様の心に残る接客でした。悪い意味で。' },
      { test: function (r) { return r.timeout >= 8; }, rank: '置物', comment: 'お客様は誰ひとり、あなたの声を聞いていません。' },
      { test: function (r) { return r.accident === 0 && r.correct >= 16; }, rank: '空気が読める店員', comment: '空気の読める従業員です。ポイントカードは引き出しにしまっておきましょう。' },
      { test: function (r) { return r.correct >= 15; }, rank: '研修修了', comment: 'おおむね良好。ときどきマニュアルが暴走します。' },
      { test: function () { return true; }, rank: '再研修', comment: '接客マニュアルの見直しが必要です。' }
    ]
  };
})();
