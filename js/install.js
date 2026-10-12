// 最初の画面（ホーム）の「アプリにする方法」。
// iPhone は自動のインストール案内が出ないので、手順を見せる。
// Android / パソコンの Chrome・Edge で「今すぐ入れる」ボタンが出る仕組みは app.js の beforeinstallprompt にある。

/** 端末の種類を判定する。iPadOS は Mac を名乗るので、タッチできる Mac は iPad とみなす。 */
export function detectPlatform(userAgent, platform = '', maxTouchPoints = 0) {
  if (/iphone|ipad|ipod/i.test(userAgent) || (platform === 'MacIntel' && maxTouchPoints > 1)) return 'ios';
  if (/android/i.test(userAgent)) return 'android';
  return 'pc';
}

/** すでにインストールされ、アプリとして開かれているか */
export function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
}

export function setupInstallGuide(openButton, dialog) {
  // インストールずみのアプリの中では、入口を出さない
  if (isStandalone()) {
    openButton.hidden = true;
    return;
  }
  openButton.addEventListener('click', () => {
    // 今つかっている端末の説明を、さいしょから開いておく
    const mine = detectPlatform(navigator.userAgent, navigator.platform, navigator.maxTouchPoints);
    dialog.querySelectorAll('details[data-platform]').forEach((d) => {
      d.open = d.dataset.platform === mine;
    });
    dialog.showModal();
  });
  dialog.querySelector('[data-close]').addEventListener('click', () => dialog.close());
  window.addEventListener('appinstalled', () => {
    openButton.hidden = true;
    if (dialog.open) dialog.close();
  });
}
