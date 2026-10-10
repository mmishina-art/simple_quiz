// 効果音は Web Audio API で作るので、音声ファイルは不要です。
export function createSound(isEnabled) {
  let ctx = null;

  function audio() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(freq, start, duration, type = 'sine', volume = 0.2) {
    const ac = audio();
    if (!ac) return;
    const t = ac.currentTime + start;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.connect(gain).connect(ac.destination);
    osc.start(t);
    osc.stop(t + duration);
  }

  const play = (fn) => () => {
    if (isEnabled()) fn();
  };

  return {
    correct: play(() => {
      tone(880, 0, 0.15, 'triangle');
      tone(1318.5, 0.12, 0.3, 'triangle');
    }),
    wrong: play(() => {
      tone(220, 0, 0.18, 'square', 0.08);
      tone(185, 0.16, 0.3, 'square', 0.08);
    }),
    flash: play(() => {
      tone(660, 0, 0.08, 'sine', 0.12);
    }),
    evolve: play(() => {
      [523.3, 659.3, 784, 1046.5, 1318.5, 1568].forEach((f, i) => tone(f, i * 0.1, 0.4, 'triangle', 0.14));
      tone(2093, 0.65, 0.8, 'sine', 0.1);
    }),
    fanfare: play(() => {
      [523.3, 659.3, 784, 1046.5].forEach((f, i) => tone(f, i * 0.12, 0.35, 'triangle', 0.15));
    }),
  };
}
