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

## ファイル構成

```
.
├── index.html                   # ゲーム本体（これ1つで動きます）
├── README.md
├── LICENSE                      # MIT（不要なら削除してください）
├── .gitignore
├── .nojekyll                    # Pages の Jekyll 処理を無効化
└── .github/workflows/pages.yml  # Pages 自動デプロイ
```

## ライセンス

MIT License

---

# ここにトイレはありません（`toilet/`）

駅の管理人になって「ここにトイレはありません」ポスターを貼る、俯瞰2Dの短編リアルタイム誘導ゲーム（約4分）。
善意で始めた案内表示が、なぜか客をどんどん呼び寄せてしまう話です。

- 遊ぶ: `toilet/index.html` をブラウザで開く ／ 公開先 `https://katomi95.github.io/ukemi-repo/toilet/`
- 操作: マウス / タッチ。下のツールバーで「貼る・移動・はがす・巨大化・赤テープ」を選び、壁の点線枠やポスターをタップ（PC は 1〜5 キーでも切替、M でミュート）
- 音量: 左上の ♪（ミュート）とスライダー

### しくみ
- 客は視界の中のポスターを認識する。大きなトイレマークは遠くから見えるが、「ここにトイレはありません」の文字は近づかないと読めない（切迫度が高いほど読めない）
- ポスターの位置・向き・大きさで、客が誤認する範囲と歩く経路が変わる。マウスを枠に重ねると、マークが見える範囲が青く表示される
- 改札から見えるポスターは駅の外の人まで呼び込み、通りすがりの人も「ついでに」トイレを探し始める。客は周りの客にもつられる
- 赤テープのバツは遠くからでも「ない」と分かるため、客は寄り道せずに別の場所を探す
- ファイル: `toilet/index.html`（画面）／`toilet/style.css`／`toilet/game.js`（ゲーム本体。Canvas 2D と Web Audio のみ、外部ライブラリなし。フォントのみ Google Fonts の DotGothic16 を読み込み、なければ標準フォント）
