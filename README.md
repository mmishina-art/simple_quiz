# 4たくクイズ（小学生むけ）

小学生向けの4択クイズゲームです。PWA なので、スマホやタブレットのホーム画面に追加してアプリのように使え、オフラインでも遊べます。
まずは **小学5年生** 向けの問題を収録しています。

## モード

| モード | 内容 |
| --- | --- |
| 📝 テスト対策モード | 国語・算数・理科・社会（5年生の学習内容）。教科別 or 全教科ミックス |
| 💡 ざつがくモード | いきもの・世界/宇宙・からだ/くらし・スポーツ/あそび |

- 1回10問。問題も選択肢の並びも毎回シャッフル
- 答えるとすぐに ⭕/❌ と解説を表示、最後に全問のふりかえり
- まちがえた問題は「ふくしゅう」で解き直せる（正解すると外れる）
- 分野ごとのさいこう記録、効果音オン/オフ（端末内の localStorage に保存）

ビルド不要の素の HTML / CSS / JavaScript です。

## 動かし方

Service Worker は `http://localhost` か HTTPS でしか動かないので、ファイルを直接開かずにサーバー経由で開いてください。

```sh
npm start            # = python3 -m http.server 8080
# → http://localhost:8080 を開く
```

### GitHub Pages で公開

`.github/workflows/pages.yml` が、push のたびに問題データをチェックしてから GitHub Pages へ自動で公開します。

初回だけ、リポジトリの **Settings → Pages → Build and deployment → Source** を **GitHub Actions** にしてください。
公開URL: https://mmishina-art.github.io/simple_quiz/

## 問題の追加

- 学校の問題: `js/data/school.js`（`grade` に学年を入れる）
- 雑学の問題: `js/data/trivia.js`

```js
{ grade: 5, q: '問題文', choices: ['正解', 'ちがう1', 'ちがう2', 'ちがう3'], answer: 0, explain: '解説' }
```

- `answer` は正解の位置（0はじまり）。表示時にシャッフルされるので、正解を先頭に書いておけばOK
- ふくしゅう機能が「カテゴリ＋番号」で問題を覚えているため、**新しい問題は配列の最後に追加**してください
- 追加したら `npm test` でデータの形（選択肢が4つ・重複なし・解説あり など）をチェックできます
- アプリのファイルを変えたら `sw.js` の `CACHE_VERSION` を上げてください。インストール済みの端末に「新しいバージョンがあります」と表示されます

## 他の学年を追加するには

`js/app.js` の `CURRENT_GRADE` で出題する学年を決めています。`grade` を変えた問題を追加し、学年選択の UI を足せば対応できます。

## ファイル構成

```
index.html             画面（ホーム / 分野選択 / クイズ / 結果）
css/style.css          スタイル（ダークモード対応）
js/app.js              ゲームの進行
js/data/*.js           問題データ
js/storage.js          記録の保存
js/sound.js            効果音（Web Audio）
sw.js                  Service Worker（オフライン対応）
manifest.webmanifest   PWA の設定
icons/                 アプリアイコン（icon.svg が元データ）
scripts/validate-questions.mjs  問題データのチェック
```
