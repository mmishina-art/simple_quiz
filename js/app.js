import { schoolSubjects, schoolQuestions } from './data/school.js';
import { triviaCategories, triviaQuestions } from './data/trivia.js';
import { englishCategories, englishQuestions } from './data/english.js';
import { createSound } from './sound.js';
import { loadState, saveState } from './storage.js';
import { charaSVG, line, stageFor, STAGES, MAX_STAGE, THRESHOLDS } from './chara.js';
import { initDebug } from './debug.js';
import { BUILDUP_SEC } from './jingles.js';

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
  english: {
    title: 'えいごモード',
    categories: englishCategories,
    questions: Object.fromEntries(Object.entries(englishQuestions).map(([cat, list]) => [cat, withIds('english', cat, list)])),
  },
};

const ALL = 'all';
const REVIEW = 'review';

// キャラの成長に数えるモード（5教科＝国語・算数・理科・社会・英語）
const GROWTH_MODES = ['school', 'english'];
const GROWTH_IDS = new Set(GROWTH_MODES.flatMap((m) => Object.values(MODES[m].questions).flat().map((q) => q.id)));

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
  if (name === 'home') renderHomeBuddy();
  if (name !== 'quiz') checkEvolution();
}

// ---------- 育成 ----------
function growth() {
  const solved = state.solved.filter((id) => GROWTH_IDS.has(id)).length;
  const total = GROWTH_IDS.size;
  const stage = stageFor(solved / total);
  // 表示する段階は、進化の演出を見せたところまで（問題が増えて割合が下がっても退化はしない）
  const shown = state.stageSeen;
  const nextAt = shown >= MAX_STAGE ? null : Math.ceil((total * THRESHOLDS[shown + 1]) / 100 - 1e-9);
  return { solved, total, stage, shown, rate: solved / total, toNext: nextAt == null ? 0 : Math.max(0, nextAt - solved) };
}

function setChara(target, stage, mood) {
  target.innerHTML = charaSVG(stage, mood);
  target.className = `chara mood-${mood}`;
  // アニメーションを毎回やり直す
  void target.offsetWidth;
}

// ふきだしを出す。消すときは見えなくするだけで、場所は残す（レイアウトがずれないように）
function say(bubble, text, ms = 0) {
  bubble.textContent = text;
  bubble.classList.remove('quiet');
  bubble.classList.remove('pop');
  void bubble.offsetWidth;
  bubble.classList.add('pop');
  clearTimeout(bubble._timer);
  if (ms) bubble._timer = setTimeout(() => bubble.classList.add('quiet'), ms);
}

function renderHomeBuddy() {
  const g = growth();
  setChara($('#home-chara'), g.shown, 'normal');
  $('#chara-name').textContent = state.charaName;
  $('#chara-level').textContent = g.shown;
  $('#chara-stage').textContent = STAGES[g.shown].name;
  const pct = Math.floor(g.rate * 100);
  const inStage = g.shown >= MAX_STAGE ? 1
    : (g.rate * 100 - THRESHOLDS[g.shown]) / (THRESHOLDS[g.shown + 1] - THRESHOLDS[g.shown]);
  $('#growth-bar').style.width = `${Math.max(0, Math.min(100, inStage * 100))}%`;
  $('#growth-text').textContent = g.shown >= MAX_STAGE
    ? `習得率 ${pct}%（${g.solved} / ${g.total}問）さいこうの すがた！`
    : `習得率 ${pct}%（${g.solved} / ${g.total}問）・つぎの進化まで あと${g.toNext}問`;
  $('#dex').replaceChildren(
    ...STAGES.map((st, i) => el('span', {
      class: `dex-item${i > g.shown ? ' locked' : ''}${i === g.shown ? ' current' : ''}`,
      title: i > g.shown ? '？？？' : `Lv.${i} ${st.name}`,
      innerHTML: charaSVG(i, 'normal'),
    })),
  );
}

function buddyReact(kind) {
  const stage = growth().shown;
  const mood = kind === 'happy' ? 'happy' : kind === 'sad' ? 'sad' : 'cheer';
  setChara($('#buddy-chara'), stage, mood);
  say($('#buddy-bubble'), line(kind, stage), kind === 'cheer' ? 2500 : 0);
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let evolving = false;

async function checkEvolution() {
  const { stage } = growth();
  if (evolving || stage <= state.stageSeen) return;
  await playEvolution(state.stageSeen, stage, { save: true });
}

// 進化の演出。save: false のときは見るだけ（デバッグ用。記録は変わらない）
async function playEvolution(from, stage, { save }) {
  if (evolving) return;
  evolving = true;
  const overlay = $('#evolve');
  const chara = $('#evolve-chara');
  const ok = $('#evolve-ok');
  overlay.className = 'evolve';
  overlay.hidden = false;
  ok.hidden = true;
  $('#confetti').replaceChildren();
  $('#evolve-title').textContent = `おや…？ ${state.charaName}のようすが…！`;
  $('#evolve-msg').textContent = '';
  setChara(chara, from, 'normal');

  const fast = reducedMotion();
  if (!fast) {
    await wait(900);
    overlay.classList.add('flashing');
    sound.buildup(state.jingle);
    await wait(BUILDUP_SEC * 1000);
  }
  overlay.classList.remove('flashing');
  overlay.classList.add('burst');
  setChara(chara, stage, 'happy');
  chara.classList.add('evolve-chara');
  sound.evolve(state.jingle);
  if (navigator.vibrate) navigator.vibrate([60, 40, 60]);
  if (!fast) spawnConfetti();
  $('#evolve-title').textContent = '🎉 しんかした！ 🎉';
  $('#evolve-msg').textContent = `${state.charaName}は Lv.${stage}「${STAGES[stage].name}」になった！`;
  if (save) {
    state.stageSeen = stage;
    saveState(state);
  }
  await wait(fast ? 0 : 900);
  ok.hidden = false;
  ok.focus();
  await new Promise((r) => { ok.onclick = r; });
  overlay.hidden = true;
  evolving = false;
  renderHomeBuddy();
  if (screens.result.classList.contains('active')) setChara($('#result-chara'), state.stageSeen, 'happy');
}

function spawnConfetti() {
  const colors = ['#ff9f1c', '#3a86ff', '#2bb673', '#e8505b', '#8338ec', '#ffd23f'];
  $('#confetti').replaceChildren(
    ...Array.from({ length: 60 }, () => el('i', {
      style: `left:${Math.random() * 100}%;background:${colors[Math.floor(Math.random() * colors.length)]};`
        + `animation-delay:${(Math.random() * 0.6).toFixed(2)}s;animation-duration:${(1.8 + Math.random() * 1.4).toFixed(2)}s;`
        + `transform:rotate(${Math.floor(Math.random() * 360)}deg)`,
    })),
  );
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
  session.solvedBefore = growth().solved;
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
  buddyReact('cheer');
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
  // キャラの成長：5教科で初めて正解した問題を記録
  if (ok && GROWTH_IDS.has(q.id) && !state.solved.includes(q.id)) state.solved.push(q.id);
  saveState(state);
  buddyReact(ok ? 'happy' : 'sad');

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

  const g = growth();
  const gained = g.solved - session.solvedBefore;
  $('#result-growth').textContent = GROWTH_MODES.includes(mode)
    ? `🌱 ${state.charaName}の習得率 ${Math.floor(g.rate * 100)}%（あたらしく正解 +${gained}問）`
    : '';

  if (rate >= 0.7) sound.fanfare();
  show('result');
  setChara($('#result-chara'), g.shown, rate >= 0.7 ? 'happy' : rate >= 0.4 ? 'cheer' : 'sad');
  say($('#result-bubble'), rate === 1 ? 'かんぺき！！' : rate >= 0.7 ? 'よくがんばったね！' : rate >= 0.4 ? 'つぎもいっしょにがんばろう！' : 'ふくしゅうしよう！');
}

// ---------- イベント ----------
// どのボタンを押しても音が出るようにする（答えのボタンは正解・不正解の音が出るので除く）
document.addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn || btn.disabled || btn.classList.contains('choice-btn')) return;
  if (btn.id === 'home-buddy') sound.boing();
  else if (btn.classList.contains('back-btn') || btn.dataset.go === 'home') sound.back();
  else sound.tap();
}, true);

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

$('#home-buddy').addEventListener('click', () => {
  const chara = $('#home-chara');
  const stage = growth().shown;
  setChara(chara, stage, 'happy');
  say($('#home-bubble'), line('happy', stage), 1600);
  clearTimeout(chara._timer);
  chara._timer = setTimeout(() => setChara(chara, stage, 'normal'), 1600);
});
// デバッグモード（?debug をURLにつけるか、タイトルを7回タップ）
initDebug({
  state, saveState, growth, setChara, renderHomeBuddy, playEvolution, checkEvolution, say, line, sound,
  growthIds: [...GROWTH_IDS],
});

$('#rename-btn').addEventListener('click', () => {
  const name = prompt('キャラクターの なまえを入れてね（8文字まで）', state.charaName);
  if (name == null) return;
  const trimmed = name.trim().slice(0, 8);
  if (!trimmed) return;
  state.charaName = trimmed;
  saveState(state);
  renderHomeBuddy();
});
show('home');

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

// Service Worker の登録と更新のお知らせは js/boot.js で行います（app.js が動かなくても更新できるように）

// ここまで来たら起動成功（js/boot.js が見ています）
window.__appStarted = true;
