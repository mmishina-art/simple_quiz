# CLAUDE.md

This file provides guidance to Claude Code when working in this repository.

## Project

4たくクイズ(`simple_quiz`): 小学生向け 4 択クイズの PWA。ビルド不要の素の HTML / CSS / JavaScript(ES Modules)。モード・機能・ファイル構成は `README.md` を参照。対象は子どもなので、画面の文言はやさしい日本語(ひらがな中心、必要に応じて `js/furigana.js` のふりがな)にする。

## Running / Testing

```bash
npm start      # python3 -m http.server 8080 → http://localhost:8080
npm test       # node scripts/validate-questions.mjs(問題データの検証)
```

`npm test` は問題データを検証する(問題文の重複、選択肢が 4 つで重複なし、必須項目など)。**問題を追加/編集したら必ず実行する。** 問題の質(正解が 2 つになる選択肢、年で変わる統計の「時点」の明記、解説の正確さ)は検証スクリプトでは見つからないので、自分で見直す。

## 更新時の必須作業

- **アプリのファイルを変えたら `sw.js` の `CACHE_VERSION` を上げる**(利用者に更新が届く)。
- **ファイルを追加/削除したら `sw.js` の `APP_SHELL` を更新する。**
- **`.github/workflows/pages.yml` の「Collect site files」が公開するファイルを列挙している**(`cp -r index.html manifest.webmanifest sw.js css js icons _site/`)。新しいトップレベルのファイル/フォルダを足したら、ここにも追加しないと公開されない。
- 新しいバージョンは待機し、画面の「こうしん」ボタン(`js/boot.js` が `skipWaiting` メッセージを送る)で切り替える。`sw.js` の `install` で `skipWaiting()` を呼ばない。

## 現状と標準のずれ(直すときは別 PR で)

- 配色は「明るい固定」(`color-scheme: light only`)。これは意図した方針(スマホがダークモードでも明るい画面のまま)。変えない。
- バージョン表示がない → ホーム画面に表示したい(元は `sw.js` の `CACHE_VERSION` と同じ番号にする)。
- デフォルトブランチが `claude/elementary-quiz-game-pwa-rrqwqt`(`main` がない)。公開もこのブランチから行われる。標準は `main`。切り替えるときは、Pages の公開ブランチと `pages.yml` の `branches` を一緒に直す。

対応済み: 更新ボタン方式(`install` で `skipWaiting()` しない)、PR 時のテスト(`test.yml`)、ESLint、専用の maskable アイコン、インストール方法の説明(ホームの「📲 アプリにする方法」)。

## 共通ルール(PWA アプリ共通)

新しい PWA アプリは、テンプレート `mmishina-art/pwa-template`(Vite + TypeScript)から作る。このリポジトリは作成時期の都合でテンプレートより前の構成だが、次のルールは共通で守る。

- オーナーは Claude Code での開発を学習中。変更は小さく、理由を添えて説明する。
- ユーザー向けの文言・説明は日本語。コードの識別子とコミットメッセージは英語(命令形、1コミット1目的)。
- 作業は feature ブランチ → PR → CI が通ったらマージ。デフォルトブランチへ直接 push しない。
- 配信は GitHub Pages のサブパス。参照パスは相対(`./`)にし、`/` から始めない。
- ユーザーデータは `localStorage` を `try/catch` で囲んで読み書きし、使えなくても動くこと。**保存キー名は変更しない**(利用者の記録が消える)。変えるなら移行処理を書く。
- 色は CSS の `:root` 変数に集約し、直書きしない。`[hidden] { display: none !important; }` を残す。
- ズーム: ピンチ拡大は許可し、ダブルタップ拡大だけ `touch-action: manipulation` で防ぐ。viewport に `user-scalable=no` / `maximum-scale` を新たに入れない。
- タップ領域は 44px 以上。`prefers-reduced-motion: reduce` でアニメーションを無効化する。結果表示は `aria-live` でも読み上げ、色だけで状態を伝えない。
- 効果音は Web Audio で合成し、オン/オフ設定を用意する。
- iPhone の安全領域(`env(safe-area-inset-*)`)を考慮する。
- **最初の画面(タイトル/ホーム)に、インストール方法の説明への入口を置く。** iPhone は自動のインストール案内が出ないため、手順(iPhone / iPad は Safari の共有 → ホーム画面に追加、Android は Chrome のメニュー → アプリをインストール、パソコンはアドレスバーのインストールのマーク)を見せる。今使っている端末の説明を最初から開き、`beforeinstallprompt` が使えるときは「今すぐインストール」も出す。インストール済み(`display-mode: standalone`)のときは入口を出さない。実装の手本はテンプレート `mmishina-art/pwa-template` の `src/install.ts`。
- **タイトル画面(最初の画面)にバージョンを表示する**(例: `v1.2`)。更新が反映されたかを、利用者がひと目で確認できるようにするため。バージョンの元は1か所に置き、公開のたびに上げる。キャッシュ優先の Service Worker を手で書いている場合は、キャッシュ名の番号と同じにして、食い違いをテストで検出する。
- 変更を終える前にテストを通し、`python3 -m http.server` などで実際に起動して動作を確認する。
