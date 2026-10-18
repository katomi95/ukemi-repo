# 受身 — UKEMI PRACTICE

ブラウザで遊べる短編2Dタイミングアクションゲームです。
落下・転倒・投げ技…どんな状況でも、地面に着く瞬間に受身を取れば大丈夫。全6ステージ、3〜5分で終わります。

## 収録作品

| 作品 | 起動 | 公開URL |
|---|---|---|
| 受身 — UKEMI PRACTICE | `index.html` | https://katomi95.github.io/ukemi-repo/ |
| 首を長くして待つ | `kubi/index.html` | https://katomi95.github.io/ukemi-repo/kubi/ |

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

## 首を長くして待つ

待ち合わせ相手がなかなか来ないので、首を長くして待つことにした主人公。
文字どおり首だけを伸ばして街を越え、待ち人の目の前まで迎えに行く 3〜5 分の昼休みゲームです。本人は一歩も動きません。

- **頭を動かす**：マウス（カーソルの方へ進む）／タッチ（指の方へ進む）／矢印キー・WASD
- **首をちぢめる**：Space・Shift・Z・右クリック長押し／スマホは左下の「↩ ちぢめる」ボタン
- 首は頭の通った道すじに沿って伸びます。来た道を引き返すと、その分だけ首がちぢみます
- 電線・看板・信号機・歩道橋・洗濯物・鳥の群れ・トンネル・ビルの隙間などがありますが、ぶつかってもゲームオーバーにはなりません（跳ね返ったり、しびれたり、洗濯物をかぶったりするだけです）
- 街の果てにいる待ち人の目の前に顔を出せばクリア

技術メモ：単一ファイル（`kubi/index.html`）、Canvas 2D と Web Audio API のみ。首の軌跡は一定間隔の点列で持ち、x 座標のバケットで近傍検索、描画は画面内の区間だけを Path2D にまとめ、引きの画では点を間引いて描いています。

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
├── index.html                   # 受身 ゲーム本体（これ1つで動きます）
├── kubi/index.html              # 首を長くして待つ ゲーム本体（これ1つで動きます）
├── README.md
├── LICENSE                      # MIT（不要なら削除してください）
├── .gitignore
├── .nojekyll                    # Pages の Jekyll 処理を無効化
└── .github/workflows/pages.yml  # Pages 自動デプロイ
```

## ライセンス

MIT License
