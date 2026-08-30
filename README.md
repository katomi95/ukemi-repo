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

## もうひとつのゲーム：青い鳥（物理）

`bluebird/index.html` は、同じリポジトリに同梱した短編ノベルゲームです。

> 幸福の青い鳥を探して世界の果てまで旅をした二人。
> しかし最後に、青い鳥はずっと“お互いの中”にいたことが分かる。
> ――ただし比喩ではない。

童話のような絵と音のまま進む、5〜10分の読み物です。旅の回想を6か所ぶん選んで振り返り、
最後に3つの選択肢からひとつを選ぶと、それぞれ別のエンディングになります。

- 操作：クリック / タップ / Space（胸の音を聞く場面と、調べる場面だけ「長押し」）
- こちらも単一ファイル（`bluebird/index.html`）で完結。Canvas 2D と Web Audio API のみ
- 公開先は `https://katomi95.github.io/ukemi-repo/bluebird/`

ローカルで遊ぶ場合は `bluebird/index.html` をブラウザで開くだけです。

## リポジトリ

https://github.com/katomi95/ukemi-repo

```bash
git clone https://github.com/katomi95/ukemi-repo.git
```

## GitHub Pages で公開する

`.github/workflows/pages.yml` を同梱しているので、**Settings → Pages → Build and deployment → Source を「GitHub Actions」に設定**すれば、`main` への push ごとに自動デプロイされます。

Actions を使わない場合は、Source を「Deploy from a branch」にして `main` / `/ (root)` を選んでも同じように公開できます（その場合 `.github/` は削除して構いません）。

公開先は `https://katomi95.github.io/ukemi-repo/` です（Pages を有効にするには、リポジトリを public にする必要があります）。

## ファイル構成

```
.
├── index.html                   # 受身（これ1つで動きます）
├── bluebird/
│   └── index.html               # 青い鳥（物理）（これ1つで動きます）
├── README.md
├── LICENSE                      # MIT（不要なら削除してください）
├── .gitignore
├── .nojekyll                    # Pages の Jekyll 処理を無効化
└── .github/workflows/pages.yml  # Pages 自動デプロイ
```

## ライセンス

MIT License
