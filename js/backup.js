// データのバックアップ／ひきつぎ（ほごしゃの方へ）
//
//  ・保存：ファイル（共有画面から「ファイル」アプリ・LINE・AirDrop などへ）／ひきつぎコード（コピーして送る）
//  ・読みこみ：ファイル／コード。中身を見せて確認してから、いまの記録と「合体」させる（記録は減らない）
//  ・消えにくくする：ブラウザに保存データを消さないよう頼む（navigator.storage.persist）
//  ・お知らせ：最後のバックアップから30日たったら、ホームに小さく表示
//
// サーバーは使いません。データはこの端末と、保存したファイル／コードの中だけにあります。
// 中身は「正解した問題・まちがえた問題・さいこう記録・キャラの名前と段階・設定」だけで、個人情報は入りません。

const CODE_PREFIX = 'QZ1';
const FILE_APP = 'simple-quiz-backup';
const REMIND_DAYS = 30;
const DAY = 24 * 60 * 60 * 1000;

// ---------- 文字列 ⇔ バイト列 ----------
const toB64url = (bytes) => {
  let bin = '';
  bytes.forEach((b) => { bin += String.fromCharCode(b); });
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const fromB64url = (s) => {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
};

// こわれていないか確かめるための短いしるし（FNV-1a）
function checksum(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(36).padStart(7, '0');
}

// ---------- 問題IDの集まり ⇔ 小さな形 ----------
// "school:kokugo:12" のようなIDを、教科（分野）ごとに「1問1ビット」にして詰める。
// 問題は配列の最後に追加していくので、古いコードも番号がずれずに読める。
function pack(ids) {
  const groups = {};
  for (const id of ids) {
    const at = id.lastIndexOf(':');
    const key = id.slice(0, at);
    const n = Number(id.slice(at + 1));
    if (!Number.isInteger(n) || n < 0) continue;
    (groups[key] ??= []).push(n);
  }
  const out = {};
  for (const [key, nums] of Object.entries(groups)) {
    const bytes = new Uint8Array(Math.floor(Math.max(...nums) / 8) + 1);
    for (const n of nums) bytes[n >> 3] |= 1 << (n & 7);
    out[key] = toB64url(bytes);
  }
  return out;
}

function unpack(obj) {
  const ids = [];
  if (!obj || typeof obj !== 'object') return ids;
  for (const [key, b64] of Object.entries(obj)) {
    if (typeof b64 !== 'string') continue;
    const bytes = fromB64url(b64);
    bytes.forEach((byte, i) => {
      for (let bit = 0; bit < 8; bit++) if (byte & (1 << bit)) ids.push(`${key}:${i * 8 + bit}`);
    });
  }
  return ids;
}

// ---------- 記録 ⇔ ひきつぎコード ----------
export function encode(state) {
  const payload = {
    v: 1,
    t: Date.now(),
    s: pack(state.solved),
    m: pack(state.mistakes),
    b: state.best,
    g: state.stageSeen,
    n: state.charaName,
    j: state.jingle,
    o: state.sound,
    r: { st: state.stats, sk: state.streak, bd: state.badges }, // 毎日の記録・バッジ
  };
  const json = JSON.stringify(payload);
  const body = toB64url(new TextEncoder().encode(json));
  return `${CODE_PREFIX}-${body}-${checksum(body)}`;
}

// コードを読む。読めないときは日本語のメッセージつきのエラーを投げる
export function decode(text) {
  const code = String(text).replace(/\s+/g, '');
  const m = code.match(/^QZ1-([A-Za-z0-9_-]+)-([0-9a-z]{7,})$/);
  if (!m) throw new Error('ひきつぎコードの形がちがいます。コードを最初から最後まで全部はりつけてください。');
  if (checksum(m[1]) !== m[2]) throw new Error('コードが途中で切れているか、まちがっています。もう一度コピーしてください。');
  let p;
  try {
    p = JSON.parse(new TextDecoder().decode(fromB64url(m[1])));
  } catch {
    throw new Error('コードを読みこめませんでした。');
  }
  if (!p || p.v !== 1) throw new Error('このアプリのバックアップではないか、新しすぎるバージョンのデータです。');
  return {
    savedAt: Number(p.t) || null,
    solved: unpack(p.s),
    mistakes: unpack(p.m),
    best: p.b && typeof p.b === 'object' ? p.b : {},
    stageSeen: Number.isInteger(p.g) ? p.g : 0,
    charaName: typeof p.n === 'string' ? p.n.slice(0, 8) : null,
    jingle: typeof p.j === 'string' ? p.j : null,
    sound: typeof p.o === 'boolean' ? p.o : null,
    stats: obj(p.r?.st),
    streak: obj(p.r?.sk),
    badges: obj(p.r?.bd),
  };
}
const obj = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});
const num = (v) => (Number.isFinite(v) ? v : 0);

// 数の記録は大きいほうをとる
function mergeStats(a = {}, b = {}) {
  const out = { ...b, ...a };
  for (const k of ['answered', 'correct', 'rounds', 'perfectRounds', 'reviewFixed']) out[k] = Math.max(num(a[k]), num(b[k]));
  out.taBest = { ...obj(b.taBest) };
  for (const [m, v] of Object.entries(obj(a.taBest))) out.taBest[m] = Math.max(num(v), num(out.taBest[m]));
  return out;
}
// れんぞく日数は、最後にやった日が新しいほうを使う（さいこう記録・日数は大きいほう）
function mergeStreak(a = {}, b = {}) {
  const newer = (b.last ?? '') > (a.last ?? '') ? b : a;
  return { ...newer, best: Math.max(num(a.best), num(b.best)), days: Math.max(num(a.days), num(b.days)) };
}

// ファイルの中身（JSON）からコードを取り出す。コードだけのテキストファイルでもよい
export function codeFromFileText(text) {
  try {
    const obj = JSON.parse(text);
    if (obj && obj.app === FILE_APP && typeof obj.code === 'string') return obj.code;
  } catch { /* JSON でなければ、コードそのものとして読む */ }
  return text;
}

// いまの記録と合体させる（どちらかで正解していれば正解ずみ、キャラは育っているほう）
export function merge(state, data, validIds) {
  const known = (id) => validIds.has(id);
  const solved = new Set(state.solved.filter(known));
  data.solved.filter(known).forEach((id) => solved.add(id));
  const mistakes = new Set(state.mistakes.filter(known));
  data.mistakes.filter(known).forEach((id) => mistakes.add(id));
  const best = { ...state.best };
  for (const [k, v] of Object.entries(data.best)) {
    if (Number.isFinite(v) && (best[k] == null || v > best[k])) best[k] = v;
  }
  return {
    ...state,
    solved: [...solved],
    mistakes: [...mistakes],
    best,
    stageSeen: Math.max(state.stageSeen, data.stageSeen),
    // 名前は、いまが最初のまま（ピコ）なら読みこんだほうを使う
    charaName: state.charaName === 'ピコ' && data.charaName ? data.charaName : state.charaName,
    jingle: state.jingle ?? data.jingle,
    stats: mergeStats(state.stats, data.stats),
    streak: mergeStreak(state.streak, data.streak),
    badges: { ...data.badges, ...state.badges },
  };
}

// ---------- 画面 ----------
export function initBackup(app) {
  const { state, saveState } = app;
  if (!state.firstUsedAt) {
    state.firstUsedAt = Date.now();
    saveState(state);
  }

  // ブラウザに「このデータは消さないで」と頼む（対応していないブラウザでは何もしない）
  let persisted = null;
  if (navigator.storage?.persist) {
    navigator.storage.persisted()
      .then((p) => p || navigator.storage.persist())
      .then((p) => { persisted = p; })
      .catch(() => {});
  }

  const $ = (sel) => document.querySelector(sel);
  const el = (tag, props = {}, children = []) => {
    const node = document.createElement(tag);
    Object.assign(node, props);
    for (const c of [].concat(children)) node.append(c);
    return node;
  };
  const fmtDate = (t) => {
    const d = new Date(t);
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  };

  // ---- ホームのお知らせ（30日バックアップしていないとき） ----
  function renderReminder() {
    const box = $('#backup-reminder');
    if (!box) return;
    const since = state.lastBackupAt ?? state.firstUsedAt;
    const hasData = state.solved.length > 0 || Object.keys(state.best).length > 0;
    box.hidden = !(hasData && Date.now() - since > REMIND_DAYS * DAY);
  }

  // ---- ほごしゃの方へ：開く前の計算問題 ----
  function gate() {
    const a = 12 + Math.floor(Math.random() * 18);
    const b = 6 + Math.floor(Math.random() * 13);
    const ans = prompt(`ほごしゃの方へ\nつづけるには、次の計算の答えを入れてください。\n${a} × ${b} = ?`);
    if (ans == null) return false;
    if (Number(String(ans).trim().replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))) === a * b) return true;
    alert('答えがちがいます。');
    return false;
  }

  // ---- パネル ----
  const panel = el('div', { id: 'parent-panel', className: 'sheet', hidden: true });
  document.body.append(panel);

  function close() {
    panel.hidden = true;
    app.renderHomeBuddy();
    renderReminder();
    app.checkEvolution(); // 読みこんだ記録で進化できるなら、ここで演出
  }

  function message(text, kind = 'info') {
    const m = panel.querySelector('.sheet-msg');
    m.textContent = text;
    m.className = `sheet-msg ${kind}`;
    m.hidden = !text;
    m.scrollIntoView({ block: 'nearest' });
  }

  // バックアップした日を記録して、パネルの表示（最後のバックアップ日）を新しくする。
  // パネルを描き直すので、メッセージやコードの表示はこのあとに出す
  function markBackedUp() {
    state.lastBackupAt = Date.now();
    saveState(state);
    renderPanel();
  }

  async function saveFile() {
    const code = encode(state);
    const now = new Date();
    const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const name = `4takuquiz-backup-${stamp}.json`;
    const body = JSON.stringify({ app: FILE_APP, exportedAt: now.toISOString(), code }, null, 2);
    const file = new File([body], name, { type: 'application/json' });
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: '4たくクイズのバックアップ' });
        markBackedUp();
        message('バックアップを保存しました。', 'ok');
        return;
      }
    } catch (err) {
      if (err?.name === 'AbortError') return; // 共有画面でキャンセル
    }
    // 共有できないブラウザでは、ダウンロードにする
    const url = URL.createObjectURL(file);
    const a = el('a', { href: url, download: name });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    markBackedUp();
    message(`「${name}」を保存しました。`, 'ok');
  }

  async function copyCode() {
    const code = encode(state);
    let copied = true;
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      copied = false;
    }
    markBackedUp();
    const area = panel.querySelector('#backup-code');
    area.value = code;
    area.hidden = false;
    if (copied) {
      message(`ひきつぎコード（${code.length}文字）をコピーしました。メモやLINEなどにはりつけて保存してください。`, 'ok');
    } else {
      area.select();
      message('下のコードを長押ししてコピーしてください。', 'info');
    }
  }

  function confirmAndMerge(text) {
    let data;
    try {
      data = decode(text);
    } catch (err) {
      message(err.message, 'error');
      return;
    }
    const valid = app.allIds;
    const solved = data.solved.filter((id) => valid.has(id) && app.growthIds.has(id)).length;
    const lines = [
      'このデータを読みこみますか？',
      '',
      `・保存した日：${data.savedAt ? fmtDate(data.savedAt) : 'ふめい'}`,
      `・キャラ：${data.charaName ?? 'ピコ'}（Lv.${data.stageSeen}）`,
      `・正解ずみ：${solved}問`,
      '',
      'いまの記録は消えずに、合わせた記録になります。',
    ];
    if (!confirm(lines.join('\n'))) return;
    const merged = merge(state, data, valid);
    Object.assign(state, merged);
    saveState(state);
    renderPanel();
    app.renderHomeBuddy();
    message(`読みこみました！ 記録を合わせて、正解ずみは${app.growth().solved}問になりました。`, 'ok');
  }

  function readFile(file) {
    const reader = new FileReader();
    reader.onload = () => confirmAndMerge(codeFromFileText(String(reader.result)));
    reader.onerror = () => message('ファイルを読みこめませんでした。', 'error');
    reader.readAsText(file);
  }

  function renderPanel() {
    const g = app.growth();
    const fileInput = el('input', { type: 'file', accept: '.json,application/json,text/plain', hidden: true });
    fileInput.addEventListener('change', () => { if (fileInput.files[0]) readFile(fileInput.files[0]); fileInput.value = ''; });
    const paste = el('textarea', { id: 'restore-code', rows: 3, placeholder: 'ここに ひきつぎコード（QZ1-…）をはりつけ' });
    const btn = (label, onClick, cls = 'secondary-btn') => {
      const b = el('button', { className: cls, textContent: label });
      b.addEventListener('click', onClick);
      return b;
    };

    panel.replaceChildren(el('div', { className: 'sheet-body' }, [
      el('div', { className: 'sheet-head' }, [
        el('h2', { textContent: '⚙️ ほごしゃの方へ' }),
        btn('とじる', close, 'chip'),
      ]),
      el('p', { className: 'sheet-msg', hidden: true }),

      el('section', { className: 'sheet-section' }, [
        el('h3', { textContent: '💾 バックアップ' }),
        el('p', { className: 'sheet-note', textContent: `いまの記録：正解ずみ ${g.solved}問・${state.charaName} Lv.${g.shown}` }),
        el('p', { className: 'sheet-note', textContent: state.lastBackupAt ? `最後のバックアップ：${fmtDate(state.lastBackupAt)}` : 'まだバックアップしていません' }),
        btn('ファイルで保存（共有）', saveFile, 'primary-btn'),
        btn('ひきつぎコードをコピー', copyCode),
        el('textarea', { id: 'backup-code', rows: 3, readOnly: true, hidden: true }),
      ]),

      el('section', { className: 'sheet-section' }, [
        el('h3', { textContent: '📲 ひきつぎ（読みこみ）' }),
        el('p', { className: 'sheet-note', textContent: '読みこんでも、いまの記録は消えません（合わせた記録になります）。' }),
        btn('ファイルから読みこむ', () => fileInput.click()),
        fileInput,
        paste,
        btn('コードを読みこむ', () => confirmAndMerge(paste.value)),
      ]),

      el('section', { className: 'sheet-section' }, [
        el('h3', { textContent: '🛡 データを守る設定' }),
        el('p', {
          className: 'sheet-note',
          textContent: persisted === true ? '消えにくい設定：オン（ブラウザに、データを消さないよう頼んでいます）'
            : persisted === false ? '消えにくい設定：ブラウザが受けつけませんでした。ホーム画面に追加したアプリで使うと消えにくくなります。'
              : '消えにくい設定：このブラウザでは使えません。こまめにバックアップしてください。',
        }),
        el('p', { className: 'sheet-note', textContent: `最後のバックアップから${REMIND_DAYS}日たつと、ホームにお知らせが出ます。` }),
      ]),
    ]));
  }

  function open() {
    if (!gate()) return;
    renderPanel();
    panel.hidden = false;
    panel.scrollTop = 0;
  }

  $('#parent-btn')?.addEventListener('click', open);
  $('#backup-reminder-btn')?.addEventListener('click', open);

  // ホームにもどるたびにお知らせを見直す
  const home = $('#screen-home');
  new MutationObserver(() => { if (home.classList.contains('active')) renderReminder(); })
    .observe(home, { attributes: true, attributeFilter: ['class'] });
  renderReminder();

  return { open, renderReminder };
}
