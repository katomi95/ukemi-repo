# 受身 — UKEMI PRACTICE

ブラウザで遊べる短編2Dタイミングアクションゲームです。
落下・転倒・投げ技…どんな状況でも、地面に着く瞬間に受身を取れば大丈夫。全6ステージ、3〜5分で終わります。

## 遊び方

- **Space キー** または **画面タップ / クリック**（操作はこれだけ）
- 地面に着く瞬間に入力すると受身が成功します
- 判定は **PERFECT / GOOD / MISS** の3段階
- 失敗しても再挑戦するだけ。ゲームオーバーはありません

## ステージ

| | ステージ | 場所 |
|---|---|---|
| LEVEL 1 | 転倒 | 柔道場 |
| LEVEL 2 | 投げ技 | 柔道場 |
| LEVEL 3 | 階段 | 屋内 |
| LEVEL 4 | 交通事故 | 横断歩道 |
| LEVEL 5 | ビル | 屋上 |
| FINAL LEVEL | 飛行機 | 高度10,000m |

## 技術メモ

- 単一ファイル（`index.html`）で完結。外部アセット・外部ライブラリ・ビルド一切なし
- 描画は Canvas 2D、効果音・BGM は Web Audio API で合成
- PC / スマートフォン両対応（縦持ちの端末では自動で横向き全画面表示）
- 右上の「♪」ボタンで音の ON / OFF

ローカルで遊ぶ場合は `index.html` をブラウザで開くだけです。

## リポジトリ

https://github.com/katomi95/ukemi-repo

```bash
git clone https://github.com/katomi95/ukemi-repo.git
```

## GitHub Pages で公開する

`.github/workflows/pages.yml` を同梱しているので、**Settings → Pages → Build and deployment → Source を「GitHub Actions」に設定**すれば、`main` への push ごとに自動デプロイされます。

Actions を使わない場合は、Source を「Deploy from a branch」にして `main` / `/ (root)` を選んでも同じように公開できます（その場合 `.github/` は削除して構いません）。

公開先は `https://katomi95.github.io/ukemi-repo/` です（Pages を有効にするには、リポジトリを public にする必要があります）。

## 同梱ゲーム：『またのご利用をお待ちしております』

`matanogoriyou/` にもう1本、短編ブラウザゲームを同梱しています。
公開先は `https://katomi95.github.io/ukemi-repo/matanogoriyou/` です（ローカルでは `matanogoriyou/index.html` を開くだけ）。

お帰りになるお客様に、接客の決まり文句「またのご利用をお待ちしております」を言うか、言わないかを瞬時に判断するゲームです。
美容院なら正解ですが、葬儀社や救急外来で言うと、従業員は善意100%で「ポイントカードもございます！」と追い打ちをかけてしまいます。

- 操作：「またのご利用をお待ちしております」（← / A）／「言わない」（→ / D）。タップ・クリックでも可
- 1プレイ20問。制限時間は約4.2秒から約2秒まで短くなります
- 全39業種（再来店を望まない業種19、歓迎する業種20）。背景・人物はすべてプログラムで生成した SVG
- 効果音は Web Audio API で合成。HUD・タイトルの「♪」でミュート
- 2回目以降の接客事故の演出は、タップ／キーでスキップできます

問題は `matanogoriyou/js/data.js` の配列に1件足すだけで追加できます（背景は `js/scenes.js` に関数を1つ追加）。

## ファイル構成

```
.
├── index.html                   # 受身 本体（これ1つで動きます）
├── matanogoriyou/               # またのご利用をお待ちしております
│   ├── index.html
│   ├── css/style.css
│   └── js/
│       ├── data.js              # 問題データ・評価コメント
│       ├── chars.js             # 人物・ポイントカードのSVG生成
│       ├── scenes.js            # 業種別背景のSVG生成
│       ├── audio.js             # 効果音
│       └── game.js              # 進行・演出・入力
├── README.md
├── LICENSE                      # MIT（不要なら削除してください）
├── .gitignore
├── .nojekyll                    # Pages の Jekyll 処理を無効化
└── .github/workflows/pages.yml  # Pages 自動デプロイ
```

## ライセンス

MIT License
