// インストール説明（js/install.js）の端末判定のチェック。validate-questions.mjs から読み込まれる
import assert from 'node:assert/strict';
import { detectPlatform } from '../js/install.js';

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const IPAD_DESKTOP = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15';
const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';
const WINDOWS = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

assert.equal(detectPlatform(IPHONE), 'ios', 'iPhone は ios');
assert.equal(detectPlatform(IPAD_DESKTOP, 'MacIntel', 5), 'ios', 'デスクトップ表示の iPad は ios');
assert.equal(detectPlatform(IPAD_DESKTOP, 'MacIntel', 0), 'pc', 'タッチできない Mac は pc');
assert.equal(detectPlatform(ANDROID), 'android', 'Android は android');
assert.equal(detectPlatform(WINDOWS, 'Win32', 0), 'pc', 'Windows は pc');
console.log('OK: インストール説明の端末判定');
