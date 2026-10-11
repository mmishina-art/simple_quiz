// 育成キャラクター。習得率（すべてのモードで一度でも正解した問題の割合）に応じて進化します。
// 絵はすべて SVG で描いているので、画像ファイルは不要です。

export const STAGES = [
  { name: 'ふしぎなたまご', color: '#fffaf0' },
  { name: 'ひびわれたまご', color: '#fffaf0' },
  { name: 'あかちゃん', color: '#ffe08a' },
  { name: 'ちびっこ', color: '#ffd166' },
  { name: 'めばえ', color: '#a8e6a1' },
  { name: 'げんきっこ', color: '#7fd8be' },
  { name: 'まなびや', color: '#8ecae6' },
  { name: 'はかせのたまご', color: '#9fb4ff' },
  { name: 'そらとぶはかせ', color: '#c3a6ff' },
  { name: 'だいはかせ', color: '#f4a6d7' },
  { name: 'でんせつのはかせ', color: '#ffd23f' },
];

export const MAX_STAGE = STAGES.length - 1;

// 各段階に進化するのに必要な習得率（%）。
// 最初は少しの正解で進化し、だんだん次の進化までが長くなります。
export const THRESHOLDS = [0, 2, 5, 9, 15, 23, 33, 45, 60, 78, 100];

// 習得率（0〜1）から段階（0〜10）を求める
export function stageFor(rate) {
  let stage = 0;
  THRESHOLDS.forEach((t, i) => { if (rate * 100 + 1e-9 >= t) stage = i; });
  return stage;
}

const INK = '#3a3340';

function eyes(mood, y = 110) {
  const L = 80, R = 120;
  if (mood === 'happy') {
    return [L, R].map((x) => `<path d="M${x - 8} ${y + 3} Q${x} ${y - 8} ${x + 8} ${y + 3}" fill="none" stroke="${INK}" stroke-width="4.5" stroke-linecap="round"/>`).join('');
  }
  if (mood === 'sad') {
    return [L, R].map((x, i) => {
      const d = i === 0 ? -1 : 1;
      return `<path d="M${x - 8} ${y - 2 + d * -3} L${x + 8} ${y - 2 + d * 3}" stroke="${INK}" stroke-width="3.5" stroke-linecap="round"/>`
        + `<ellipse cx="${x}" cy="${y + 5}" rx="5" ry="6" fill="${INK}"/>`;
    }).join('') + `<path d="M${L - 4} ${y + 12} q-4 9 0 13 q4 -4 0 -13z" fill="#6ec6ff"/>`;
  }
  return [L, R].map((x) => `<ellipse cx="${x}" cy="${y}" rx="7" ry="9" fill="${INK}"/><circle cx="${x + 2.5}" cy="${y - 3.5}" r="2.6" fill="#fff"/>`).join('');
}

function mouth(mood, y = 127) {
  if (mood === 'happy') return `<path d="M88 ${y - 3} Q100 ${y + 16} 112 ${y - 3} Z" fill="#d9485f" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`;
  if (mood === 'sad') return `<path d="M91 ${y + 6} Q100 ${y - 3} 109 ${y + 6}" fill="none" stroke="${INK}" stroke-width="3.5" stroke-linecap="round"/>`;
  if (mood === 'cheer') return `<ellipse cx="100" cy="${y + 2}" rx="6" ry="7" fill="#d9485f" stroke="${INK}" stroke-width="3"/>`;
  return `<path d="M92 ${y - 1} Q100 ${y + 7} 108 ${y - 1}" fill="none" stroke="${INK}" stroke-width="3.5" stroke-linecap="round"/>`;
}

function blush(mood) {
  const o = mood === 'happy' ? 0.85 : 0.5;
  return `<ellipse cx="66" cy="125" rx="9" ry="5.5" fill="#ff8fa3" opacity="${o}"/><ellipse cx="134" cy="125" rx="9" ry="5.5" fill="#ff8fa3" opacity="${o}"/>`;
}

function face(mood) {
  return eyes(mood) + mouth(mood) + blush(mood);
}

function egg(stage, mood) {
  const spots = stage === 0
    ? `<circle cx="80" cy="95" r="9" fill="#ffc8dd"/><circle cx="122" cy="80" r="7" fill="#bde0fe"/><circle cx="118" cy="140" r="10" fill="#caffbf"/><circle cx="78" cy="148" r="6" fill="#ffd6a5"/>`
    : `<circle cx="118" cy="140" r="10" fill="#caffbf"/><circle cx="78" cy="148" r="6" fill="#ffd6a5"/><circle cx="104" cy="62" r="6" fill="#bde0fe"/>`;
  let s = `<ellipse cx="100" cy="112" rx="50" ry="62" fill="${STAGES[stage].color}" stroke="${INK}" stroke-width="4"/>${spots}`;
  if (stage === 1) {
    s += `<path d="M52 118 L66 108 L78 122 L92 106 L106 122 L120 108 L134 122 L149 112" fill="none" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/>`;
    s += eyes(mood, 90);
  }
  return s;
}

function sprout() {
  return `<path d="M100 70 Q98 56 100 46" fill="none" stroke="#3a7d44" stroke-width="4" stroke-linecap="round"/>`
    + `<path d="M100 50 Q86 36 74 44 Q86 58 100 50Z" fill="#6bbf59" stroke="${INK}" stroke-width="2.5"/>`
    + `<path d="M100 50 Q114 36 126 44 Q114 58 100 50Z" fill="#8bd17c" stroke="${INK}" stroke-width="2.5"/>`;
}

function cap(stage) {
  const gold = stage >= 10;
  const top = gold ? '#ffb703' : '#2d3047';
  const tassel = gold ? '#e63946' : '#ffb703';
  return `<path d="M72 70 Q100 58 128 70 L128 80 Q100 70 72 80Z" fill="${top}" stroke="${INK}" stroke-width="3"/>`
    + `<polygon points="54,62 100,44 146,62 100,80" fill="${top}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`
    + `<path d="M100 62 L140 66 L140 88" fill="none" stroke="${tassel}" stroke-width="3"/><circle cx="140" cy="91" r="4.5" fill="${tassel}"/>`
    + (gold ? `<path d="M100 52 l3 6 6 1 -4.5 4 1 6 -5.5 -3 -5.5 3 1 -6 -4.5 -4 6 -1z" fill="#fff59d" stroke="${INK}" stroke-width="1.5"/>` : '');
}

function cape(stage) {
  const c = stage >= 10 ? '#e63946' : '#ef476f';
  return `<path d="M62 100 Q40 150 52 178 L148 178 Q160 150 138 100Z" fill="${c}" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/>`;
}

function wings(mood) {
  const lift = mood === 'happy' ? -10 : 0;
  const w = (dir) => `<g transform="translate(${100 + dir * 52} ${108 + lift}) scale(${dir * 0.85} 0.85)">`
    + `<path d="M0 0 Q30 -30 46 -10 Q34 -6 40 6 Q26 4 28 16 Q12 12 0 14Z" fill="#fff" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/></g>`;
  return w(-1) + w(1);
}

function glasses() {
  return `<g fill="none" stroke="${INK}" stroke-width="3"><circle cx="80" cy="110" r="13"/><circle cx="120" cy="110" r="13"/><path d="M93 108 Q100 103 107 108"/></g>`;
}

function aura() {
  const rays = Array.from({ length: 12 }, (_, i) => {
    const a = (i * Math.PI) / 6;
    const x1 = 100 + Math.cos(a) * 78, y1 = 115 + Math.sin(a) * 78;
    const x2 = 100 + Math.cos(a) * 96, y2 = 115 + Math.sin(a) * 96;
    return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#ffd23f" stroke-width="5" stroke-linecap="round"/>`;
  }).join('');
  return `<circle cx="100" cy="115" r="74" fill="#fff3b0" opacity="0.55"/>${rays}`;
}

function creature(stage, mood) {
  const color = STAGES[stage].color;
  const arms = stage >= 5;
  const armUp = mood === 'happy' || mood === 'cheer';
  let back = '';
  if (stage >= 10) back += aura();
  if (stage >= 8) back += wings(mood);
  if (stage >= 7) back += cape(stage);

  let body = '';
  if (arms) {
    const arm = (dir) => armUp
      ? `<ellipse cx="${100 + dir * 60}" cy="92" rx="10" ry="16" transform="rotate(${dir * 30} ${100 + dir * 60} 92)" fill="${color}" stroke="${INK}" stroke-width="3.5"/>`
      : `<ellipse cx="${100 + dir * 58}" cy="130" rx="10" ry="15" transform="rotate(${dir * -20} ${100 + dir * 58} 130)" fill="${color}" stroke="${INK}" stroke-width="3.5"/>`;
    body += arm(-1) + arm(1);
  }
  if (stage >= 3) {
    body += `<ellipse cx="76" cy="170" rx="15" ry="8" fill="${color}" stroke="${INK}" stroke-width="3.5"/><ellipse cx="124" cy="170" rx="15" ry="8" fill="${color}" stroke="${INK}" stroke-width="3.5"/>`;
  }
  body += `<ellipse cx="100" cy="120" rx="58" ry="52" fill="${color}" stroke="${INK}" stroke-width="4"/>`;
  body += `<ellipse cx="100" cy="140" rx="32" ry="22" fill="#fff" opacity="0.45"/>`;
  body += face(mood);
  if (stage >= 9) body += glasses();
  if (stage >= 6) body += cap(stage);
  else if (stage >= 4) body += sprout();

  if (stage === 2) {
    // からから出てきたばかり
    body += `<path d="M44 138 L58 126 L70 140 L84 124 L100 140 L116 124 L130 140 L142 126 L156 138 Q158 182 100 184 Q42 182 44 138Z" fill="#fffaf0" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>`;
  }
  const scale = [1, 1, 0.8, 0.82, 0.86, 0.9, 0.94, 0.97, 1, 1, 1][stage];
  return back + `<g transform="translate(100 120) scale(${scale}) translate(-100 -120)">${body}</g>`;
}

// mood: 'normal' | 'happy' | 'sad' | 'cheer'
export function charaSVG(stage, mood = 'normal') {
  const s = Math.max(0, Math.min(MAX_STAGE, stage));
  const inner = s <= 1 ? egg(s, mood) : creature(s, mood);
  return `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${STAGES[s].name}">${inner}</svg>`;
}

const LINES = {
  cheer: ['がんばれ〜！', 'ゆっくり考えてね', 'きみならできる！', 'ファイト！', 'よく読んでね', 'いっしょにがんばろう！'],
  happy: ['やったね！', 'すごい！', 'せいかい〜！', 'さすが！', 'てんさい！', 'うれしい！'],
  sad: ['ドンマイ！', 'つぎはできるよ', 'おぼえちゃおう！', 'くやしい〜', 'かいせつを読もう！'],
  egg: ['……（ゴロゴロ）', '……（コトコト）', '……（ぴくっ）'],
};

export function line(kind, stage) {
  const list = stage <= 1 ? LINES.egg : LINES[kind];
  return list[Math.floor(Math.random() * list.length)];
}
