// 毎日の記録（○日れんぞく）・成績の数字・バッジ

const DAY = 24 * 60 * 60 * 1000;

// その端末の時刻での「今日」（YYYY-MM-DD）
export function today(now = Date.now()) {
  const d = new Date(now);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
const daysBetween = (a, b) => Math.round((new Date(`${b}T00:00:00`) - new Date(`${a}T00:00:00`)) / DAY);

export function emptyStats() {
  return { answered: 0, correct: 0, rounds: 0, perfectRounds: 0, reviewFixed: 0, taBest: {} };
}
export function emptyStreak() {
  return { last: null, count: 0, best: 0, days: 0 };
}

// 1問答えたときに記録する
export function recordAnswer(state, { ok, wasMistake }, now = Date.now()) {
  state.stats = { ...emptyStats(), ...state.stats };
  state.stats.answered++;
  if (ok) state.stats.correct++;
  if (ok && wasMistake) state.stats.reviewFixed++;
  // 今日はじめて答えたら、れんぞく日数を数える
  const s = { ...emptyStreak(), ...state.streak };
  const t = today(now);
  if (s.last !== t) {
    s.count = s.last && daysBetween(s.last, t) === 1 ? s.count + 1 : 1;
    s.best = Math.max(s.best, s.count);
    s.days++;
    s.last = t;
  }
  state.streak = s;
}

// いまの「れんぞく日数」（きのうも今日もやっていなければ 0）
export function currentStreak(state, now = Date.now()) {
  const s = { ...emptyStreak(), ...state.streak };
  if (!s.last) return 0;
  const gap = daysBetween(s.last, today(now));
  return gap <= 1 ? s.count : 0;
}

// 1回（10問）終わったときに記録する
export function recordRound(state, { total, correct, timeAttack, mode }) {
  state.stats = { ...emptyStats(), ...state.stats };
  state.stats.rounds++;
  if (!timeAttack && total >= 10 && correct === total) state.stats.perfectRounds++;
  if (timeAttack) {
    const prev = state.stats.taBest[mode] ?? 0;
    if (correct > prev) state.stats.taBest = { ...state.stats.taBest, [mode]: correct };
    return correct > prev && prev > 0; // さいこう記録こうしん
  }
  return false;
}

// ---------- バッジ ----------
// ctx: { subjectRate(cat) → 0〜1, triviaSolved, stage }
export const BADGES = [
  { id: 'first', icon: '🐣', name: 'はじめの一歩', hint: 'クイズを1回さいごまでやる', test: (s) => s.stats.rounds >= 1 },
  { id: 'perfect1', icon: '💯', name: 'ぜんもんせいかい', hint: '10問ぜんぶ正解する', test: (s) => s.stats.perfectRounds >= 1 },
  { id: 'perfect5', icon: '👑', name: 'ぜんもんマスター', hint: '10問ぜんぶ正解を5回', test: (s) => s.stats.perfectRounds >= 5 },
  { id: 'streak3', icon: '🔥', name: '3日れんぞく', hint: '3日つづけて勉強する', test: (s) => s.streak.best >= 3 },
  { id: 'streak7', icon: '📅', name: '1週間れんぞく', hint: '7日つづけて勉強する', test: (s) => s.streak.best >= 7 },
  { id: 'streak30', icon: '🏔', name: '30日れんぞく', hint: '30日つづけて勉強する', test: (s) => s.streak.best >= 30 },
  { id: 'ans100', icon: '✏️', name: '100問ちょうせん', hint: '問題を100問とく', test: (s) => s.stats.answered >= 100 },
  { id: 'ans500', icon: '📚', name: '500問ちょうせん', hint: '問題を500問とく', test: (s) => s.stats.answered >= 500 },
  { id: 'ans1000', icon: '🎓', name: '1000問ちょうせん', hint: '問題を1000問とく', test: (s) => s.stats.answered >= 1000 },
  { id: 'kokugo', icon: '📖', name: '国語はかせ', hint: '国語の問題の半分以上を正解', test: (s, c) => c.subjectRate('kokugo') >= 0.5 },
  { id: 'sansu', icon: '🔢', name: '算数はかせ', hint: '算数の問題の半分以上を正解', test: (s, c) => c.subjectRate('sansu') >= 0.5 },
  { id: 'rika', icon: '🔬', name: '理科はかせ', hint: '理科の問題の半分以上を正解', test: (s, c) => c.subjectRate('rika') >= 0.5 },
  { id: 'shakai', icon: '🗾', name: '社会はかせ', hint: '社会の問題の半分以上を正解', test: (s, c) => c.subjectRate('shakai') >= 0.5 },
  { id: 'english', icon: '🔤', name: '英語はかせ', hint: '英語の問題の半分以上を正解', test: (s, c) => c.subjectRate('english') >= 0.5 },
  { id: 'trivia', icon: '💡', name: 'ざつがく王', hint: 'ざつがくの問題を100問正解', test: (s, c) => c.triviaSolved >= 100 },
  { id: 'review', icon: '🔁', name: 'ふくしゅう名人', hint: 'まちがえた問題を10問なおす', test: (s) => s.stats.reviewFixed >= 10 },
  { id: 'ta10', icon: '⚡', name: 'スピードスター', hint: 'タイムアタックで10問正解', test: (s) => Math.max(0, ...Object.values(s.stats.taBest)) >= 10 },
  { id: 'ta20', icon: '🌩', name: 'いなずま', hint: 'タイムアタックで20問正解', test: (s) => Math.max(0, ...Object.values(s.stats.taBest)) >= 20 },
  { id: 'lv5', icon: '🌱', name: 'すくすく', hint: 'キャラが Lv.5 になる', test: (s, c) => c.stage >= 5 },
  { id: 'lv10', icon: '🌟', name: 'でんせつ', hint: 'キャラが Lv.10 になる', test: (s, c) => c.stage >= 10 },
];

// 新しくもらえたバッジを返す（もらった日を state.badges に記録）
export function checkBadges(state, ctx, now = Date.now()) {
  state.stats = { ...emptyStats(), ...state.stats };
  state.streak = { ...emptyStreak(), ...state.streak };
  state.badges = { ...state.badges };
  const earned = [];
  for (const b of BADGES) {
    if (state.badges[b.id]) continue;
    if (b.test(state, ctx)) {
      state.badges[b.id] = now;
      earned.push(b);
    }
  }
  return earned;
}
