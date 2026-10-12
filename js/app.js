import { schoolSubjects, schoolQuestions } from './data/school.js';
import { triviaCategories, triviaQuestions } from './data/trivia.js';
import { englishCategories, englishQuestions } from './data/english.js';
import { createSound } from './sound.js';
import { loadState, saveState } from './storage.js';
import { charaSVG, line, stageFor, STAGES, MAX_STAGE, THRESHOLDS } from './chara.js';
import { initDebug } from './debug.js';
import { initBackup } from './backup.js';
import { setupInstallGuide } from './install.js';
import { APP_VERSION } from './version.js';
import { rubyFragment } from './furigana.js';
import { canSpeak, speak, stopSpeaking, questionSpeech, answerSpeech, isEnglish } from './speech.js';
import { BUILDUP_SEC } from './jingles.js';
import { recordAnswer, recordRound, currentStreak, checkBadges, BADGES } from './records.js';

const ROUND_SIZE = 10;
const CURRENT_GRADE = 5; // ひとまず5年生向け。学年を増やすときはここを設定画面から変えられるようにする。
const CHOICE_MARKS = ['ア', 'イ', 'ウ', 'エ'];
const TA_SEC = 60; // タイムアタックの時間（秒）

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

// キャラの成長に数えるモード（国語・算数・理科・社会・ざつがく・英語のぜんぶ）
const GROWTH_MODES = ['school', 'trivia', 'english'];
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
  const days = currentStreak(state);
  const best = state.streak?.best ?? 0;
  $('#streak-text').textContent = days > 0
    ? `🔥 ${days}日れんぞく（さいこう ${best}日）`
    : best > 0 ? `今日もやって れんぞく記録をのばそう！（さいこう ${best}日）` : '🔥 毎日やると「れんぞく日数」がふえるよ';
  $('#badge-btn').textContent = `🏅 バッジ ${Object.keys(state.badges ?? {}).length}/${BADGES.length}`;
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

// 文字を表示する（ふりがながオンなら、むずかしい漢字に読みがなをつける）
function rich(node, text, opts) {
  node.replaceChildren(state.furigana ? rubyFragment(text ?? '', opts) : (text ?? ''));
  return node;
}
// 国語では、問題の「」の中と選択肢にはふりがなをつけない（読み方の問題で答えが分かってしまうため）
const noRubyAnswer = (q) => q.cat === 'kokugo';

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

  const taBest = state.stats?.taBest?.[mode];
  $('#ta-btn').textContent = `⏱ ${TA_SEC}びょう タイムアタック${taBest ? `（さいこう ${taBest}もん）` : ''}`;
  $('#ta-btn').onclick = () => startQuiz(mode, ALL, { timeAttack: true });

  show('select');
}

// ---------- クイズ ----------
// 出す問題をえらぶ。まだ正解していない問題を優先し、まちがえた問題も少しまぜる。
// 足りないときだけ、もう正解した問題から出す。
function pickQuestions(pool, n) {
  const solved = new Set(state.solved);
  const missed = new Set(state.mistakes);
  const mistakes = shuffle(pool.filter((q) => missed.has(q.id)));
  const unsolved = shuffle(pool.filter((q) => !solved.has(q.id) && !missed.has(q.id)));
  const done = shuffle(pool.filter((q) => solved.has(q.id) && !missed.has(q.id)));
  const order = [...mistakes.slice(0, 3), ...unsolved, ...mistakes.slice(3), ...done];
  return shuffle(order.slice(0, n));
}

// 選択肢をシャッフルして、正解の位置を記録しなおす
function prepare(q) {
  const order = shuffle(q.choices.map((_, i) => i));
  return { ...q, shuffled: order.map((i) => q.choices[i]), correctIndex: order.indexOf(q.answer) };
}

function startQuiz(mode, cat, { timeAttack = false } = {}) {
  const pool = poolFor(mode, cat);
  if (pool.length === 0) return;
  stopTimeAttack();
  // タイムアタックは、時間内に答えきれないくらいの数を用意しておく
  const questions = pickQuestions(pool, timeAttack ? 120 : ROUND_SIZE).map(prepare);
  session = { mode, cat, questions, index: 0, results: [], timeAttack };
  session.solvedBefore = growth().solved;
  $('.progress').setAttribute('aria-valuemax', String(timeAttack ? TA_SEC : questions.length));
  $('#screen-quiz').classList.toggle('time-attack', timeAttack);
  show('quiz');
  if (timeAttack) {
    session.endAt = Date.now() + TA_SEC * 1000;
    session.timer = setInterval(tickTimeAttack, 200);
  }
  renderQuestion();
}

// ---------- タイムアタック ----------
function tickTimeAttack() {
  if (!session?.timeAttack || session.finished) return;
  const left = Math.max(0, session.endAt - Date.now());
  const sec = Math.ceil(left / 1000);
  const correct = session.results.filter((r) => r.ok).length;
  $('#progress-bar').style.width = `${(left / (TA_SEC * 1000)) * 100}%`;
  $('.progress').setAttribute('aria-valuenow', String(sec));
  $('#progress-text').textContent = `⏱${sec} ⭕${correct}`;
  $('#screen-quiz').classList.toggle('ta-hurry', sec <= 10);
  if (left <= 0) finishTimeAttack();
}

function stopTimeAttack() {
  if (session?.timer) clearInterval(session.timer);
  if (session) session.timer = null;
  clearTimeout(session?.nextTimer);
  $('#screen-quiz').classList.remove('ta-hurry');
}

function finishTimeAttack() {
  if (session.finished) return;
  session.finished = true;
  stopTimeAttack();
  sound.fanfare();
  showResult();
}

function renderQuestion() {
  const { questions, index, mode } = session;
  const q = questions[index];
  const info = categoryInfo(mode, q.cat);

  if (session.timeAttack) tickTimeAttack();
  else {
    $('#progress-bar').style.width = `${(index / questions.length) * 100}%`;
    $('.progress').setAttribute('aria-valuenow', String(index));
    $('#progress-text').textContent = `${index + 1} / ${questions.length}`;
  }

  const tag = $('#question-tag');
  tag.textContent = `${info.icon} ${info.name}`;
  tag.style.setProperty('--tag-color', info.color);
  rich($('#question-text'), q.q, { skipQuoted: noRubyAnswer(q) });

  // 英語モードでは、選択肢の英語も読み上げられるように 🔊 をつける
  const english = mode === 'english' && canSpeak() && !session.timeAttack;
  const choices = $('#choices');
  choices.replaceChildren(
    ...q.shuffled.map((text, i) => {
      const btn = el('button', { class: 'choice-btn', onclick: () => answer(i) }, [
        el('span', { class: 'choice-mark', textContent: CHOICE_MARKS[i] }),
        noRubyAnswer(q) ? el('span', { textContent: text }) : rich(el('span'), text),
      ]);
      if (!(english && isEnglish(text))) return btn;
      return el('div', { class: 'choice-row' }, [
        btn,
        el('button', { class: 'speak-btn small', textContent: '🔊', ariaLabel: `「${text}」を読み上げる`, onclick: () => speak(text) }),
      ]);
    }),
  );

  // 問題の英語を読み上げるボタン（タイムアタックでは出さない）
  stopSpeaking();
  const speakBtn = $('#speak-btn');
  const before = english && !session.timeAttack ? questionSpeech(q) : '';
  speakBtn.hidden = !before;
  speakBtn.onclick = () => speak(before);

  $('#feedback').hidden = true;
  buddyReact('cheer');
}

function answer(chosen) {
  if (session.finished || session.answered === session.index) return;
  session.answered = session.index;
  const q = session.questions[session.index];
  const ok = chosen === q.correctIndex;
  session.results.push({ q, chosen, ok });
  recordAnswer(state, { ok, wasMistake: state.mistakes.includes(q.id) });

  [...$('#choices').querySelectorAll('.choice-btn')].forEach((btn, i) => {
    btn.disabled = true;
    if (i === q.correctIndex) btn.classList.add('correct');
    else if (i === chosen) btn.classList.add('wrong');
    else btn.classList.add('dim');
  });

  // ふくしゅうリストの更新：まちがえたら追加、正解したら外す
  state.mistakes = state.mistakes.filter((id) => id !== q.id);
  if (!ok) state.mistakes.push(q.id);
  // 一度でも正解した問題を記録（出題の優先順位に使う。キャラの成長にも使う）
  if (ok && !state.solved.includes(q.id)) state.solved.push(q.id);
  saveState(state);
  buddyReact(ok ? 'happy' : 'sad');

  ok ? sound.correct() : sound.wrong();
  if (!ok && navigator.vibrate) navigator.vibrate(120);

  // タイムアタック：説明は出さずに、すぐつぎの問題へ（まちがえたときは正解を少し見せる）
  if (session.timeAttack) {
    tickTimeAttack();
    session.nextTimer = setTimeout(next, ok ? 450 : 1000);
    return;
  }

  const fb = $('#feedback');
  fb.className = `feedback ${ok ? 'is-correct' : 'is-wrong'}`;
  rich($('#feedback-title'), ok ? '⭕ せいかい！' : `❌ ざんねん… こたえは「${q.shuffled[q.correctIndex]}」`, { skipQuoted: noRubyAnswer(q) });
  rich($('#feedback-explain'), q.explain ?? '');

  // 英語モード：答えたあとは、正解を入れた文を読む（おとがオンなら自動で1回）
  if (session.mode === 'english' && canSpeak()) {
    const after = answerSpeech(q, q.shuffled[q.correctIndex]);
    const speakBtn = $('#speak-btn');
    speakBtn.hidden = !after;
    speakBtn.onclick = () => speak(after);
    if (after && state.sound) setTimeout(() => speak(after), 500);
  }
  $('#next-btn').textContent = session.index + 1 < session.questions.length ? 'つぎへ ▶' : 'けっかを見る ▶';
  fb.hidden = false;
  $('#next-btn').focus({ preventScroll: true });
  fb.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function next() {
  if (session.finished) return;
  session.index++;
  if (session.timeAttack && session.index >= session.questions.length) {
    finishTimeAttack();
    return;
  }
  if (session.index < session.questions.length) {
    renderQuestion();
    window.scrollTo(0, 0);
  } else {
    showResult();
  }
}

// ---------- 結果 ----------
function showResult() {
  const { results, mode, cat, timeAttack } = session;
  const total = results.length;
  const correct = results.filter((r) => r.ok).length;
  // タイムアタックは正解の数で、ふつうは正解の割合で ほめかたを決める
  const rate = timeAttack ? Math.min(1, correct / 20) : total ? correct / total : 0;

  const taRecord = recordRound(state, { total, correct, timeAttack, mode });
  const prevStage = growth().stage;

  // 10問そろっているときだけ「さいこう点」を記録（ふくしゅうは記録しない）
  let newRecord = false;
  if (!timeAttack && cat !== REVIEW && total === ROUND_SIZE) {
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
  if (timeAttack) {
    $('#result-message').textContent = `⏱ ${TA_SEC}びょうで ${correct}もん せいかい！${correct >= 20 ? '🌩' : correct >= 10 ? '⚡' : ''}`;
    $('#result-best').textContent = taRecord ? '🏆 さいこう記録こうしん！' : `さいこう記録：${state.stats.taBest[mode] ?? 0}もん`;
  }

  // バッジ
  const earned = checkBadges(state, badgeContext(prevStage));
  saveState(state);
  const badgeBox = $('#result-badges');
  badgeBox.hidden = earned.length === 0;
  badgeBox.replaceChildren(
    el('p', { class: 'result-badges-title', textContent: '🏅 バッジをゲット！' }),
    ...earned.map((b) => el('p', { class: 'result-badge' }, [
      el('span', { class: 'badge-icon', textContent: b.icon, ariaHidden: 'true' }),
      el('span', { textContent: `${b.name}（${b.hint}）` }),
    ])),
  );

  $('#result-list').replaceChildren(
    ...results.map(({ q, chosen, ok }) =>
      el('li', { class: ok ? 'ok' : 'ng' }, [
        rich(el('div', { class: 'rq' }), `${ok ? '⭕' : '❌'} ${q.q}`, { skipQuoted: noRubyAnswer(q) }),
        el('div', { class: 'ra' }, [
          'こたえ：',
          noRubyAnswer(q) ? el('b', { textContent: q.shuffled[q.correctIndex] }) : rich(el('b'), q.shuffled[q.correctIndex]),
          ok ? '' : `（えらんだのは「${q.shuffled[chosen]}」）`,
        ]),
        q.explain ? rich(el('div', { class: 'ra' }), q.explain) : '',
      ]),
    ),
  );

  const g = growth();
  const gained = g.solved - session.solvedBefore;
  $('#result-growth').textContent = GROWTH_MODES.includes(mode)
    ? `🌱 ${state.charaName}の習得率 ${Math.floor(g.rate * 100)}%（あたらしく正解 +${gained}問）`
    : '';

  if (rate >= 0.7 && !timeAttack) sound.fanfare();
  else if (earned.length) sound.fanfare();
  show('result');
  setChara($('#result-chara'), g.shown, rate >= 0.7 ? 'happy' : rate >= 0.4 ? 'cheer' : 'sad');
  say($('#result-bubble'), rate === 1 ? 'かんぺき！！' : rate >= 0.7 ? 'よくがんばったね！' : rate >= 0.4 ? 'つぎもいっしょにがんばろう！' : 'ふくしゅうしよう！');
}

// ---------- バッジ ----------
function badgeContext(stage = growth().stage) {
  const solved = new Set(state.solved);
  const rateOf = (list) => (list.length ? list.filter((q) => solved.has(q.id)).length / list.length : 0);
  return {
    subjectRate: (cat) => rateOf(cat === 'english' ? Object.values(MODES.english.questions).flat() : MODES.school.questions[cat] ?? []),
    triviaSolved: state.solved.filter((id) => id.startsWith('trivia:')).length,
    stage: Math.max(stage, state.stageSeen),
  };
}

function openBadges() {
  const got = state.badges ?? {};
  const fmt = (t) => { const d = new Date(t); return `${d.getMonth() + 1}/${d.getDate()}`; };
  const panel = el('div', { class: 'sheet', id: 'badge-panel' });
  const close = () => panel.remove();
  panel.addEventListener('click', (e) => { if (e.target === panel) close(); });
  const s = state.stats ?? {};
  panel.append(el('div', { class: 'sheet-body' }, [
    el('div', { class: 'sheet-head' }, [
      el('h2', { textContent: `🏅 バッジ ${Object.keys(got).length}/${BADGES.length}` }),
      el('button', { class: 'chip', textContent: 'とじる', onclick: close }),
    ]),
    el('p', { class: 'sheet-note badge-stats', textContent:
      `といた数 ${s.answered ?? 0}問・正解 ${s.correct ?? 0}問・れんぞく さいこう ${state.streak?.best ?? 0}日・勉強した日 ${state.streak?.days ?? 0}日` }),
    el('div', { class: 'badge-grid' }, BADGES.map((b) => el('div', { class: `badge-item${got[b.id] ? '' : ' locked'}` }, [
      el('span', { class: 'badge-icon', textContent: got[b.id] ? b.icon : '🔒', ariaHidden: 'true' }),
      el('b', { textContent: got[b.id] ? b.name : '？？？' }),
      el('small', { textContent: got[b.id] ? `${b.hint}（${fmt(got[b.id])}）` : b.hint }),
    ]))),
  ]));
  document.body.append(panel);
}

// ---------- イベント ----------
// どのボタンを押しても音が出るようにする（答えのボタンは正解・不正解の音が出るので除く）
document.addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn || btn.disabled || btn.classList.contains('choice-btn') || btn.classList.contains('speak-btn')) return;
  if (btn.id === 'home-buddy') sound.boing();
  else if (btn.classList.contains('back-btn') || btn.dataset.go === 'home') sound.back();
  else sound.tap();
}, true);

document.querySelectorAll('[data-mode]').forEach((btn) => btn.addEventListener('click', () => openSelect(btn.dataset.mode)));
document.querySelectorAll('[data-go="home"]').forEach((btn) => btn.addEventListener('click', () => show('home')));
$('#next-btn').addEventListener('click', next);
$('#quit-btn').addEventListener('click', () => {
  if (session.results.length === 0 || confirm('クイズをやめてもいい？')) {
    session.finished = true;
    stopTimeAttack();
    openSelect(session.mode);
  }
});
$('#retry-btn').addEventListener('click', () => {
  // ふくしゅうで全部正解したら問題がなくなるので、分野選択にもどる
  if (poolFor(session.mode, session.cat).length === 0) openSelect(session.mode);
  else startQuiz(session.mode, session.cat, { timeAttack: session.timeAttack });
});
$('#badge-btn').addEventListener('click', openBadges);

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

const furiganaBtn = $('#furigana-toggle');
function renderFuriganaBtn() {
  furiganaBtn.textContent = state.furigana ? 'ふりがな：オン' : 'ふりがな：オフ';
  furiganaBtn.setAttribute('aria-pressed', String(state.furigana));
  document.body.classList.toggle('furigana-on', state.furigana);
}
furiganaBtn.addEventListener('click', () => {
  state.furigana = !state.furigana;
  saveState(state);
  renderFuriganaBtn();
});
renderFuriganaBtn();

$('#grade-label').textContent = `${CURRENT_GRADE}年生`;

$('#home-buddy').addEventListener('click', () => {
  const chara = $('#home-chara');
  const stage = growth().shown;
  setChara(chara, stage, 'happy');
  say($('#home-bubble'), line('happy', stage), 1600);
  clearTimeout(chara._timer);
  chara._timer = setTimeout(() => setChara(chara, stage, 'normal'), 1600);
});
// データのバックアップ／ひきつぎ（ホームの「ほごしゃの方へ」）
initBackup({
  state, saveState, growth, renderHomeBuddy, checkEvolution,
  growthIds: GROWTH_IDS,
  allIds: new Set(Object.values(MODES).flatMap((m) => Object.values(m.questions).flat().map((q) => q.id))),
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
setupInstallGuide($('#install-open'), $('#install-dialog'));
$('#app-version').textContent = APP_VERSION;
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
