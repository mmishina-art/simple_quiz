import js from "@eslint/js";
import globals from "globals";

export default [
  { ignores: ["node_modules/"] },
  js.configs.recommended,
  {
    // ブラウザで動くアプリ本体（ES Modules）
    files: ["js/**/*.js"],
    languageOptions: { globals: globals.browser },
  },
  {
    // boot.js は module ではなく、普通の <script> として読み込まれる
    files: ["js/boot.js"],
    languageOptions: { sourceType: "script", globals: globals.browser },
  },
  {
    // Service Worker は別の環境で動く
    files: ["sw.js"],
    languageOptions: { globals: globals.serviceworker },
  },
  {
    // Node.js で動くスクリプトと設定
    files: ["scripts/**/*.mjs", "*.config.js"],
    languageOptions: { globals: globals.node },
  },
  {
    rules: {
      // 使っていない変数はミスのことが多いので止める（catch の引数は除く）
      "no-unused-vars": ["error", { caughtErrors: "none" }],
      // == は使わない。ただし x == null（null と undefined をまとめて判定する書き方）は許可する
      eqeqeq: ["error", "always", { null: "ignore" }],
      // 保存領域が使えない場合などに、失敗を無視する意図の空の catch は許可する
      "no-empty": ["error", { allowEmptyCatch: true }],
      // 日本語の見出しに使う全角スペースは、文字列・テンプレート・コメントの中なら許可する
      "no-irregular-whitespace": ["error", { skipStrings: true, skipTemplates: true, skipComments: true }],
      "prefer-const": "error",
    },
  },
];
