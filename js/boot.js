// アプリの「起動係」。app.js とは別のふつうのスクリプトなので、
// もし app.js が読みこめなくても、ここは必ず動きます。
//  ・Service Worker（オフライン対応）の登録と「新しいバージョンがあります」の表示
//  ・アプリが起動できなかったときの自動修復（保存しているキャッシュを消して読みこみ直す）
//    ※ 学習の記録やキャラの成長（localStorage）は消しません
//    ※ 消すのは、このアプリの Service Worker とキャッシュだけです（同じサイトのほかのアプリのものは消しません）
(function () {
  'use strict';
  // このアプリの置き場所と ID。GitHub Pages では、すべてのアプリが同じサイトに載り、
  // Service Worker とキャッシュはサイトの単位で見えるので、範囲を絞らないと、ほかのアプリのキャッシュまで消してしまいます。
  var BASE = new URL('./', location.href).href;
  var APP_ID = 'simple-quiz';
  var REPAIR_KEY = APP_ID + ':repaired-at';
  var userAsked = false;

  // このアプリの Service Worker か（scope がこのアプリの置き場所と同じ）
  function isMyRegistration(reg) { return reg.scope === BASE; }
  // このアプリのキャッシュか（名前が「ID-」で始まる。sw.js の CACHE_NAME と同じ）
  function isMyCache(name) { return name.indexOf(APP_ID + '-') === 0; }

  // ---------- 起動できなかったときの修復 ----------
  function repair() {
    var jobs = [];
    if ('serviceWorker' in navigator) {
      jobs.push(navigator.serviceWorker.getRegistrations().then(function (regs) {
        return Promise.all(regs.filter(isMyRegistration).map(function (r) { return r.unregister(); }));
      }));
    }
    if (window.caches) {
      jobs.push(caches.keys().then(function (keys) {
        return Promise.all(keys.filter(isMyCache).map(function (k) { return caches.delete(k); }));
      }));
    }
    return Promise.all(jobs).catch(function () {}).then(function () {
      location.reload();
    });
  }

  function showBootError() {
    var box = document.getElementById('boot-error');
    if (!box) return;
    box.hidden = false;
    document.getElementById('boot-repair').onclick = function () {
      box.textContent = 'なおしています…';
      repair();
    };
  }

  var failed = false;
  function onStartFailed() {
    if (failed || window.__appStarted) return;
    failed = true;
    // 1回目は自動でなおす（無限にくり返さないよう、2分以内の2回目はボタンを出す）
    var last = 0;
    try { last = Number(sessionStorage.getItem(REPAIR_KEY)) || 0; } catch (e) {}
    if (Date.now() - last > 2 * 60 * 1000) {
      try { sessionStorage.setItem(REPAIR_KEY, String(Date.now())); } catch (e) {}
      repair();
    } else {
      showBootError();
    }
  }

  // 読みこみエラー（ファイルの組み合わせがおかしい など）が起きたら
  window.addEventListener('error', function () {
    if (!window.__appStarted) setTimeout(onStartFailed, 300);
  });
  // エラーが出なくても、8秒たって起動していなければ
  window.addEventListener('load', function () {
    setTimeout(onStartFailed, 8000);
  });

  // ---------- Service Worker ----------
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('sw.js').then(function (reg) {
      // 新しいバージョンは待機する（sw.js は自分では skipWaiting しない）。
      // 使っている最中に勝手に読みこみ直すとクイズがとぎれるので、お知らせを出して、おしたら切りかえて読みこみ直す
      function promptUpdate(worker) {
        if (!window.__appStarted) { worker.postMessage('skipWaiting'); return; }
        var toast = document.getElementById('update-toast');
        if (!toast) return;
        toast.hidden = false;
        document.getElementById('update-btn').onclick = function () {
          userAsked = true;
          worker.postMessage('skipWaiting');
          location.reload();
        };
      }
      if (reg.waiting && navigator.serviceWorker.controller) promptUpdate(reg.waiting);
      reg.addEventListener('updatefound', function () {
        var worker = reg.installing;
        if (!worker) return;
        worker.addEventListener('statechange', function () {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) promptUpdate(worker);
        });
      });
      // アプリにもどってきたときにも更新を確かめる
      document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'visible') reg.update().catch(function () {});
      });
    }).catch(function (err) {
      console.warn('Service worker registration failed:', err);
    });
    // アプリが起動できていないときだけ、新しいバージョンにかわったら自動で読みこみ直す
    var reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', function () {
      if (reloaded || userAsked || window.__appStarted) return;
      reloaded = true;
      location.reload();
    });
  });
})();
