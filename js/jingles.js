// 進化のときに鳴らすジングル（どれもオリジナル曲）。
// Web Audio API で、金管楽器・ベル・ドラム・ひびき（リバーブ）を作って鳴らします。

export const JINGLES = [
  { id: 'retro', name: 'レトロゲーム', desc: 'ファミコン風のクリア音（ふつうはこれ）' },
  { id: 'fanfare', name: 'ファンファーレ', desc: '金管の「タタタ・ターン！」' },
  { id: 'magic', name: 'キラキラ', desc: 'ヒュイーン→ベルがキラキラ' },
  { id: 'jajan', name: 'ジャジャーン', desc: '短くはでな一発' },
];
export const DEFAULT_JINGLE = 'retro';

// 音の高さ（Hz）。n('C5') のように使う
const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const n = (name) => {
  const m = name.match(/^([A-G])(#?)(\d)$/);
  const semis = NOTE[m[1]] + (m[2] ? 1 : 0) + (Number(m[3]) + 1) * 12;
  return 440 * 2 ** ((semis - 69) / 12);
};

// ---------- 音の通り道（コンプレッサー＋ひびき） ----------
function impulse(ac, seconds, decay) {
  const len = Math.floor(ac.sampleRate * seconds);
  const buf = ac.createBuffer(2, len, ac.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** decay;
  }
  return buf;
}

function bus(ac) {
  if (ac.__jingleBus) return ac.__jingleBus;
  const comp = ac.createDynamicsCompressor();
  comp.threshold.value = -14;
  comp.ratio.value = 4;
  comp.connect(ac.destination);
  const dry = ac.createGain();
  dry.gain.value = 0.9;
  dry.connect(comp);
  const verb = ac.createConvolver();
  verb.buffer = impulse(ac, 1.8, 2.6);
  const wet = ac.createGain();
  wet.gain.value = 0.32;
  verb.connect(wet).connect(comp);
  ac.__jingleBus = { dry, verb };
  return ac.__jingleBus;
}

// 音をつなぐ（send はひびきの量 0〜1）
function out(ac, node, send = 0.4) {
  const b = bus(ac);
  node.connect(b.dry);
  if (send > 0) {
    const s = ac.createGain();
    s.gain.value = send;
    node.connect(s).connect(b.verb);
  }
}

// ---------- 楽器 ----------
// 金管楽器（のこぎり波を2つ少しずらして重ね、フィルターで明るさを動かす）
function brass(ac, t0, freq, dur, vol = 0.12, send = 0.35) {
  const t = ac.currentTime + 0.02 + t0;
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.03);
  g.gain.setValueAtTime(vol * 0.85, t + Math.max(0.05, dur - 0.08));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.12);
  const f = ac.createBiquadFilter();
  f.type = 'lowpass';
  f.Q.value = 2;
  f.frequency.setValueAtTime(freq * 2, t);
  f.frequency.exponentialRampToValueAtTime(freq * 7, t + 0.06);
  f.frequency.exponentialRampToValueAtTime(freq * 4, t + dur);
  for (const detune of [-7, 7]) {
    const o = ac.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = freq;
    o.detune.value = detune;
    o.connect(f);
    o.start(t);
    o.stop(t + dur + 0.2);
  }
  f.connect(g);
  out(ac, g, send);
}

// ベル（基音＋高い倍音、すぐに減衰）
function bell(ac, t0, freq, dur = 1.2, vol = 0.08, send = 0.6) {
  const t = ac.currentTime + 0.02 + t0;
  [[1, 1], [2.01, 0.35], [3.98, 0.12]].forEach(([mul, amp]) => {
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = 'sine';
    o.frequency.value = freq * mul;
    g.gain.setValueAtTime(vol * amp, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur / mul);
    o.connect(g);
    out(ac, g, send);
    o.start(t);
    o.stop(t + dur);
  });
}

// やわらかいパッド（三角波をゆっくり大きく）
function pad(ac, t0, freq, dur, vol = 0.05, send = 0.7) {
  const t = ac.currentTime + 0.02 + t0;
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = 'triangle';
  o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.25);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g);
  out(ac, g, send);
  o.start(t);
  o.stop(t + dur + 0.05);
}

// ファミコン風（矩形波・三角波）。vib を指定するとビブラート
function chip(ac, t0, freq, dur, { type = 'square', vol = 0.06, vib = 0, send = 0.2 } = {}) {
  const t = ac.currentTime + 0.02 + t0;
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = type;
  o.frequency.value = freq;
  if (vib) {
    const lfo = ac.createOscillator();
    const lg = ac.createGain();
    lfo.frequency.value = 6;
    lg.gain.setValueAtTime(0, t);
    lg.gain.linearRampToValueAtTime(freq * vib, t + dur * 0.6);
    lfo.connect(lg).connect(o.frequency);
    lfo.start(t);
    lfo.stop(t + dur + 0.05);
  }
  g.gain.setValueAtTime(vol, t);
  g.gain.setValueAtTime(vol, t + dur * 0.85);
  g.gain.linearRampToValueAtTime(0.0001, t + dur);
  o.connect(g);
  out(ac, g, send);
  o.start(t);
  o.stop(t + dur + 0.05);
}

let noiseBuf = null;
function noise(ac) {
  if (!noiseBuf || noiseBuf.sampleRate !== ac.sampleRate) {
    noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  return noiseBuf;
}

// ノイズ系の打楽器（スネア・シンバル）
function hit(ac, t0, { dur = 0.15, vol = 0.15, freq = 2000, type = 'bandpass', send = 0.3 } = {}) {
  const t = ac.currentTime + 0.02 + t0;
  const src = ac.createBufferSource();
  src.buffer = noise(ac);
  const f = ac.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  const g = ac.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g);
  out(ac, g, send);
  src.start(t);
  src.stop(t + dur + 0.05);
}

// 大だいこ・ティンパニ風
function kick(ac, t0, { vol = 0.5, from = 140, to = 45, dur = 0.35 } = {}) {
  const t = ac.currentTime + 0.02 + t0;
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(from, t);
  o.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g);
  out(ac, g, 0.15);
  o.start(t);
  o.stop(t + dur + 0.05);
}

const crash = (ac, t0, vol = 0.12) => hit(ac, t0, { dur: 1.6, vol, freq: 7000, type: 'highpass', send: 0.5 });
const snare = (ac, t0, vol = 0.14) => hit(ac, t0, { dur: 0.12, vol, freq: 1800 });

// ヒュイーンと上がる音
function sweep(ac, t0, from, to, dur, vol = 0.05) {
  const t = ac.currentTime + 0.02 + t0;
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(from, t);
  o.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + dur * 0.7);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g);
  out(ac, g, 0.6);
  o.start(t);
  o.stop(t + dur + 0.05);
}

const chord = (fn, ac, t0, notes, ...args) => notes.forEach((x) => fn(ac, t0, n(x), ...args));

// ---------- ジングル（オリジナル） ----------
const PLAY = {
  // 金管の「タタタ・ターン！」→ さいごにシンバルとベル
  fanfare(ac) {
    const T = 0.13;
    chord(brass, ac, 0, ['C4', 'E4', 'G4'], T * 0.8, 0.07);
    chord(brass, ac, T, ['C4', 'E4', 'G4'], T * 0.8, 0.07);
    chord(brass, ac, T * 2, ['C4', 'E4', 'G4'], T * 0.8, 0.07);
    chord(brass, ac, T * 3, ['F4', 'A4', 'C5'], 0.32, 0.07);
    chord(brass, ac, T * 3 + 0.36, ['G4', 'B4', 'D5'], 0.32, 0.07);
    [0, T, T * 2].forEach((s) => snare(ac, s, 0.08));
    kick(ac, T * 3, { vol: 0.35 });
    kick(ac, T * 3 + 0.36, { vol: 0.35 });
    const end = T * 3 + 0.74;
    chord(brass, ac, end, ['C4', 'G4', 'C5', 'E5', 'G5'], 1.3, 0.065);
    kick(ac, end, { vol: 0.55, dur: 0.6 });
    crash(ac, end, 0.14);
    ['C6', 'E6', 'G6', 'C7'].forEach((x, i) => bell(ac, end + 0.08 + i * 0.07, n(x), 1.4, 0.05));
  },

  // ヒュイーン → ベルがキラキラ → やわらかい和音
  magic(ac) {
    sweep(ac, 0, 300, 2400, 0.7, 0.14);
    hit(ac, 0, { dur: 0.7, vol: 0.06, freq: 6000, type: 'highpass', send: 0.6 });
    const run = ['C6', 'D6', 'E6', 'G6', 'A6', 'C7', 'D7', 'E7'];
    run.forEach((x, i) => bell(ac, 0.6 + i * 0.055, n(x), 1.2, 0.13));
    ['E7', 'C7', 'A6', 'G6'].forEach((x, i) => bell(ac, 1.1 + i * 0.09, n(x), 1.4, 0.1));
    chord(pad, ac, 0.65, ['C4', 'E4', 'G4', 'C5', 'E5'], 2.0, 0.08);
    bell(ac, 0.62, n('C5'), 2.2, 0.2);
  },

  // ファミコン風のクリア音（はやいアルペジオ＋ドラム＋ビブラート）
  retro(ac) {
    const S = 0.075;
    const lead = [['G4', 0, 1], ['C5', 1, 1], ['E5', 2, 1], ['G5', 3, 2], ['E5', 5, 1], ['G5', 6, 2],
      ['A5', 8, 1], ['F5', 9, 1], ['A5', 10, 1], ['C6', 11, 2], ['B5', 13, 1], ['D6', 14, 2], ['C6', 16, 10]];
    lead.forEach(([x, s, l]) => chip(ac, s * S, n(x), l * S, { vol: 0.06, vib: s === 16 ? 0.012 : 0 }));
    // 和音のアルペジオ（2本目の矩形波）
    const arps = [['C4', 'E4', 'G4'], ['F4', 'A4', 'C5'], ['G4', 'B4', 'D5'], ['C5', 'E5', 'G5']];
    arps.forEach((notes, bar) => {
      const len = bar === 3 ? 10 : 4;
      for (let i = 0; i < len; i++) chip(ac, (bar * 4 + i) * S + (bar === 3 ? 4 * S : 0), n(notes[i % 3]), S * 0.9, { vol: 0.025, type: 'square' });
    });
    // ベース（三角波）
    [['C3', 0, 4], ['F3', 4, 4], ['G3', 8, 4], ['G2', 12, 4], ['C3', 16, 10]]
      .forEach(([x, s, l]) => chip(ac, s * S, n(x), l * S * 0.95, { type: 'triangle', vol: 0.14 }));
    // ドラム
    for (let i = 0; i < 16; i += 2) (i % 4 === 0 ? kick(ac, i * S, { vol: 0.3, dur: 0.15 }) : snare(ac, i * S, 0.07));
    kick(ac, 16 * S, { vol: 0.4 });
    crash(ac, 16 * S, 0.08);
  },

  // ドラムロール → ジャジャーン！
  jajan(ac) {
    for (let i = 0; i < 10; i++) snare(ac, i * 0.045, 0.03 + i * 0.008);
    const t = 0.5;
    chord(brass, ac, t, ['C4', 'G4', 'C5', 'E5'], 0.16, 0.07);
    kick(ac, t, { vol: 0.45 });
    chord(brass, ac, t + 0.22, ['C4', 'G4', 'C5', 'E5', 'G5', 'C6'], 1.2, 0.06);
    kick(ac, t + 0.22, { vol: 0.6, dur: 0.7 });
    crash(ac, t + 0.22, 0.16);
    bell(ac, t + 0.25, n('G6'), 1.5, 0.05);
    bell(ac, t + 0.32, n('C7'), 1.5, 0.05);
  },
};

export function playJingle(ac, id) {
  (PLAY[id] ?? PLAY[DEFAULT_JINGLE])(ac);
}
