import { schoolSubjects, schoolQuestions } from './data/school.js';
import { triviaCategories, triviaQuestions } from './data/trivia.js';
import { createSound } from './sound.js';
import { loadState, saveState } from './storage.js';

const ROUND_SIZE = 10;
const CURRENT_GRADE = 5; // ひとまず5年生向け。学年を増やすときはここを設定画面から変えられるようにする。
const CHOICE_MARKS = ['ア', 'イ', 'ウ', 'エ'];

const MODES = {
  school: {
    title: 'テスト対策モード',
    categories: schoolSubjects,
    // 学年でしぼりこむ
    questions: Object.fromEntries(
      Object.entries(schoolQuestions).map(([cat, list]) => [cat, withIds('school', cat, list).filter((q) => q.grade === CURRENT_GRADE)]),
    ),
  },
  trivia: {
    title: 'ざつがくモード',
    categories: triviaCategories,
    questions: Object.fromEntries(Object.entries(triviaQuestions).map(([cat, list]) => [cat, withIds('trivia', cat, list)])),
  },
};

const ALL = 'all';
const REVIEW = 'review';

function withIds(mode, cat, list) {
  return list.map((q, i) => ({ ...q, id: `${mode}:${cat}:${i}`, mode, cat }));
}

// ---------- 状態 ----------
const state = loadState();
const sound = createSound(() => state.sound);
let session = null; // { mode, cat, questions, index, results }

// ---------- DOM ----------
const $ = (sel) => document.querySelector(sel);
const screens = {
  home: $('#screen-home'),
  select: $('#screen-select'),
  quiz: $('#screen-quiz'),
  result: $('#screen-result'),
};

function show(name) {
  for (const [key, el] of Object.entries(screens)) el.classList.toggle('active', key === name);
  window.scrollTo(0, 0);
}

// ---------- ユーティリティ ----------
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') node.className = v;
    else if (k === 'style') node.style.cssText = v;
    else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
    else node[k] = v;
  }
  for (const c of [].concat(children)) node.append(c);
  return node;
}

function categoryInfo(mode, cat) {
  if (cat === ALL) return { name: 'ぜんぶ', icon: '🌈', color: 'var(--primary)' };
  if (cat === REVIEW) return { name: 'ふくしゅう', icon: '🔁', color: 'var(--wrong)' };
  return MODES[mode].categories.find((c) => c.id === cat);
}

function poolFor(mode, cat) {
  const qs = MODES[mode].questions;
  if (cat === ALL) return Object.values(qs).flat();
  if (cat === REVIEW) return Object.values(qs).flat().filter((q) => state.mistakes.includes(q.id));
  return qs[cat] ?? [];
}

function bestKey(mode, cat) {
  return `${mode}:${cat}`;
}

// ---------- 分野選択 ----------
function openSelect(mode) {
  const m = MODES[mode];
  $('#select-title').textContent = m.title;
  $('#round-size').textContent = ROUND_SIZE;

  const list = $('#category-list');
  list.replaceChildren();
  for (const c of [...m.categories, { id: ALL, ...categoryInfo(mode, ALL) }]) {
    const count = poolFor(mode, c.id).length;
    const best = state.best[bestKey(mode, c.id)];
    list.append(
      el('button', {
        class: `category-btn${c.id === ALL ? ' wide' : ''}`,
        style: `--cat-color:${c.color}`,
        disabled: count === 0,
        onclick: () => startQuiz(mode, c.id),
      }, [
        el('span', { class: 'cat-icon', textContent: c.icon, ariaHidden: 'true' }),
        el('span', { class: 'cat-name', textContent: c.name }),
        el('span', { class: 'cat-best', textContent: best != null ? `さいこう ${best}点` : `${count}もん` }),
      ]),
    );
  }

  const reviewCount = poolFor(mode, REVIEW).length;
  const reviewBtn = $('#review-btn');
  reviewBtn.hidden = reviewCount === 0;
  reviewBtn.textContent = `🔁 まちがえた問題をふくしゅう（${reviewCount}もん）`;
  reviewBtn.onclick = () => startQuiz(mode, REVIEW);

  show('select');
}

// ---------- クイズ ----------
function startQuiz(mode, cat) {
  const pool = poolFor(mode, cat);
  if (pool.length === 0) return;
  const questions = shuffle(pool)
    .slice(0, ROUND_SIZE)
    .map((q) => {
      // 選択肢をシャッフルして、正解の位置を記録しなおす
      const order = shuffle(q.choices.map((_, i) => i));
      return { ...q, shuffled: order.map((i) => q.choices[i]), correctIndex: order.indexOf(q.answer) };
    });
  session = { mode, cat, questions, index: 0, results: [] };
  $('.progress').setAttribute('aria-valuemax', String(questions.length));
  show('quiz');
  renderQuestion();
}

function renderQuestion() {
  const { questions, index, mode } = session;
  const q = questions[index];
  const info = categoryInfo(mode, q.cat);

  $('#progress-bar').style.width = `${(index / questions.length) * 100}%`;
  $('.progress').setAttribute('aria-valuenow', String(index));
  $('#progress-text').textContent = `${index + 1} / ${questions.length}`;

  const tag = $('#question-tag');
  tag.textContent = `${info.icon} ${info.name}`;
  tag.style.setProperty('--tag-color', info.color);
  $('#question-text').textContent = q.q;

  const choices = $('#choices');
  choices.replaceChildren(
    ...q.shuffled.map((text, i) =>
      el('button', { class: 'choice-btn', onclick: () => answer(i) }, [
        el('span', { class: 'choice-mark', textContent: CHOICE_MARKS[i] }),
        el('span', { textContent: text }),
      ]),
    ),
  );

  $('#feedback').hidden = true;
}

function answer(chosen) {
  const q = session.questions[session.index];
  const ok = chosen === q.correctIndex;
  session.results.push({ q, chosen, ok });

  [...$('#choices').children].forEach((btn, i) => {
    btn.disabled = true;
    if (i === q.correctIndex) btn.classList.add('correct');
    else if (i === chosen) btn.classList.add('wrong');
    else btn.classList.add('dim');
  });

  // ふくしゅうリストの更新：まちがえたら追加、正解したら外す
  state.mistakes = state.mistakes.filter((id) => id !== q.id);
  if (!ok) state.mistakes.push(q.id);
  saveState(state);

  ok ? sound.correct() : sound.wrong();
  if (!ok && navigator.vibrate) navigator.vibrate(120);

  const fb = $('#feedback');
  fb.className = `feedback ${ok ? 'is-correct' : 'is-wrong'}`;
  $('#feedback-title').textContent = ok ? '⭕ せいかい！' : `❌ ざんねん… こたえは「${q.shuffled[q.correctIndex]}」`;
  $('#feedback-explain').textContent = q.explain ?? '';
  $('#next-btn').textContent = session.index + 1 < session.questions.length ? 'つぎへ ▶' : 'けっかを見る ▶';
  fb.hidden = false;
  $('#next-btn').focus({ preventScroll: true });
  fb.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function next() {
  session.index++;
  if (session.index < session.questions.length) {
    renderQuestion();
    window.scrollTo(0, 0);
  } else {
    showResult();
  }
}

// ---------- 結果 ----------
function showResult() {
  const { results, mode, cat } = session;
  const total = results.length;
  const correct = results.filter((r) => r.ok).length;
  const rate = correct / total;

  // 10問そろっているときだけ「さいこう点」を記録（ふくしゅうは記録しない）
  let newRecord = false;
  if (cat !== REVIEW && total === ROUND_SIZE) {
    const key = bestKey(mode, cat);
    if (state.best[key] == null || correct > state.best[key]) {
      newRecord = state.best[key] != null;
      state.best[key] = correct;
      saveState(state);
    }
  }

  $('#progress-bar').style.width = '100%';
  $('#result-correct').textContent = correct;
  $('#result-total').textContent = total;
  const stars = rate === 1 ? 3 : rate >= 0.7 ? 2 : rate >= 0.4 ? 1 : 0;
  $('#result-stars').textContent = '★'.repeat(stars) + '☆'.repeat(3 - stars);
  $('#result-message').textContent =
    rate === 1 ? 'ぜんもんせいかい！すごい！🎉'
      : rate >= 0.7 ? 'よくできました！👏'
        : rate >= 0.4 ? 'そのちょうし！もう少し！💪'
          : 'ふりかえってもう一回やってみよう！📚';
  const best = state.best[bestKey(mode, cat)];
  $('#result-best').textContent = newRecord ? '🏆 さいこう記録こうしん！' : best != null && cat !== REVIEW ? `さいこう記録：${best}点` : '';

  $('#result-list').replaceChildren(
    ...results.map(({ q, chosen, ok }) =>
      el('li', { class: ok ? 'ok' : 'ng' }, [
        el('div', { class: 'rq', textContent: `${ok ? '⭕' : '❌'} ${q.q}` }),
        el('div', { class: 'ra' }, [
          'こたえ：',
          el('b', { textContent: q.shuffled[q.correctIndex] }),
          ok ? '' : `（えらんだのは「${q.shuffled[chosen]}」）`,
        ]),
        q.explain ? el('div', { class: 'ra', textContent: q.explain }) : '',
      ]),
    ),
  );

  if (rate >= 0.7) sound.fanfare();
  show('result');
}

// ---------- イベント ----------
document.querySelectorAll('[data-mode]').forEach((btn) => btn.addEventListener('click', () => openSelect(btn.dataset.mode)));
document.querySelectorAll('[data-go="home"]').forEach((btn) => btn.addEventListener('click', () => show('home')));
$('#next-btn').addEventListener('click', next);
$('#quit-btn').addEventListener('click', () => {
  if (session.results.length === 0 || confirm('クイズをやめてもいい？')) openSelect(session.mode);
});
$('#retry-btn').addEventListener('click', () => {
  // ふくしゅうで全部正解したら問題がなくなるので、分野選択にもどる
  if (poolFor(session.mode, session.cat).length === 0) openSelect(session.mode);
  else startQuiz(session.mode, session.cat);
});

const soundBtn = $('#sound-toggle');
function renderSoundBtn() {
  soundBtn.textContent = state.sound ? '🔊 おと：オン' : '🔇 おと：オフ';
  soundBtn.setAttribute('aria-pressed', String(state.sound));
}
soundBtn.addEventListener('click', () => {
  state.sound = !state.sound;
  saveState(state);
  renderSoundBtn();
  sound.correct();
});
renderSoundBtn();

$('#grade-label').textContent = `${CURRENT_GRADE}年生`;

// ---------- PWA ----------
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  $('#install-btn').hidden = false;
});
$('#install-btn').addEventListener('click', async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  $('#install-btn').hidden = true;
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('sw.js');
      const promptUpdate = (worker) => {
        $('#update-toast').hidden = false;
        $('#update-btn').onclick = () => worker.postMessage('skipWaiting');
      };
      if (reg.waiting && navigator.serviceWorker.controller) promptUpdate(reg.waiting);
      reg.addEventListener('updatefound', () => {
        const worker = reg.installing;
        worker?.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) promptUpdate(worker);
        });
      });
      let reloaded = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (reloaded) return;
        reloaded = true;
        location.reload();
      });
    } catch (err) {
      console.warn('Service worker registration failed:', err);
    }
  });
}
