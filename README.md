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

## もうひとつのゲーム：地獄を作るぞ。DIYで。

同じリポジトリに、短編ゲーム **「地獄を作るぞ。DIYで。」（HELL CONSTRUCTION DIY）** を `hell/` に同梱しています。

> 軍服姿の指揮官が部下に宣言する。「さあ諸君。地獄を作るぞ」——次の場面は、朝9時のホームセンター。

ホームセンターの資材（ベニヤ板・園芸用支柱・ビニールプール・赤色LED・結束バンド…）だけで、針山地獄・血の池地獄・灼熱地獄・叫喚地獄をDIY施工する、地獄DIY施工シミュレーションです。1プレイ5〜10分。

- 遊ぶ： `hell/index.html` をブラウザで開く（公開先は `https://katomi95.github.io/ukemi-repo/hell/`）
- 操作：資材をドラッグ＆ドロップ、またはタップで選択→枠をタップ。カットシーンはクリック／タップ／Space で送り
- 演出は最後まで重厚・荘厳。やっていることだけがDIY
- `hell/index.html` 1ファイルで完結（画像・音声・外部ライブラリなし。SVG と Web Audio API で生成）

| | ステージ | 作るもの |
|---|---|---|
| STAGE 1 | PROJECT NEEDLE | 針山地獄 |
| STAGE 2 | OPERATION CRIMSON POND | 血の池地獄 |
| STAGE 3 | OPERATION INFERNO | 灼熱地獄 |
| STAGE 4 | ETERNAL SCREAM | 叫喚地獄 |
| FINAL | TOTAL INFERNO | 全設備を同時稼働 → 閻魔監査 |

地獄らしさ（HELL）を上げるほど危険になり、安全対策を取るほど地獄らしさが下がります。最後に地獄監査が入り、評価が出ます。

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

## ファイル構成

```
.
├── index.html                   # 「受身」本体（これ1つで動きます）
├── hell/index.html              # 「地獄を作るぞ。DIYで。」本体（これ1つで動きます）
├── README.md
├── LICENSE                      # MIT（不要なら削除してください）
├── .gitignore
├── .nojekyll                    # Pages の Jekyll 処理を無効化
└── .github/workflows/pages.yml  # Pages 自動デプロイ
```

## ライセンス

MIT License
