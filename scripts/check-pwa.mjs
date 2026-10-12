// PWA の整合性チェック。validate-questions.mjs から読み込まれる（npm test）
//  1. js/version.js と sw.js のバージョンが同じ
//  2. sw.js がキャッシュするファイルが、すべて存在する
//  3. 画面のスクリプトが、キャッシュ対象に入っている
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { APP_VERSION } from '../js/version.js';

const root = new URL('../', import.meta.url);
const sw = readFileSync(new URL('sw.js', root), 'utf8');

const cacheVersion = /const CACHE_VERSION = '([^']+)'/.exec(sw)[1];
assert.equal(cacheVersion, APP_VERSION, 'sw.js の CACHE_VERSION を js/version.js の APP_VERSION と同じ番号にしてください');

const shell = /const APP_SHELL = \[([\s\S]*?)\];/.exec(sw)[1]
  .match(/'([^']+)'/g)
  .map((x) => x.slice(1, -1))
  .filter((x) => x !== './');
for (const file of shell) assert.ok(existsSync(new URL(file, root)), `sw.js の APP_SHELL にあるファイルが見つかりません: ${file}`);
for (const file of ['./js/version.js', './js/install.js', './js/app.js', './js/boot.js']) {
  assert.ok(shell.includes(file), `sw.js の APP_SHELL に ${file} がありません`);
}
// 同じサイトのほかのアプリのキャッシュを消さない（起動失敗の復旧と、sw.js の片づけが、このアプリだけを対象にする）
const boot = readFileSync(new URL('js/boot.js', root), 'utf8');
assert.ok(boot.includes('regs.filter(isMyRegistration)'), 'boot.js の復旧は、このアプリの Service Worker だけを対象にしてください');
assert.ok(boot.includes('keys.filter(isMyCache)'), 'boot.js の復旧は、このアプリのキャッシュだけを対象にしてください');
const appId = /var APP_ID = '([^']+)'/.exec(boot)[1];
assert.ok(sw.includes('const CACHE_NAME = `' + appId + '-'), 'sw.js のキャッシュ名は、boot.js の APP_ID で始めてください');
assert.ok(sw.includes("k.startsWith('" + appId + "-') && k !== CACHE_NAME"), 'sw.js の古いキャッシュの片づけは、このアプリのキャッシュだけを対象にしてください');
console.log(`OK: PWA の整合性（バージョン ${APP_VERSION}、キャッシュ対象 ${shell.length} ファイル）`);
