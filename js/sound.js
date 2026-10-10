// 効果音は Web Audio API で作るので、音声ファイルは不要です。
//
// アプリを閉じたりバックグラウンドにしたりすると、ブラウザは音声（AudioContext）を
// 止めます（iPhone では "interrupted"、ほかでは "suspended"）。
// 止まったままだと音が鳴ったり鳴らなかったりするので、
// ・鳴らす前に止まっていたら再開し、再開が終わってから鳴らす
// ・画面をタッチしたとき（ブラウザが音を許可するタイミング）にも再開しておく
// ・こわれていたら（closed）作り直す
// ようにしています。
export function createSound(isEnabled) {
  let ctx = null;

  function audio() {
    if (!ctx || ctx.state === 'closed') {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    return ctx;
  }

  // 止まっていたら再開する。再開できたら true
  async function ensureRunning() {
    const ac = audio();
    if (!ac) return false;
    if (ac.state !== 'running') {
      try {
        await ac.resume();
      } catch {
        return false;
      }
    }
    return ac.state === 'running';
  }

  // 画面にふれたときに音声を起こしておく（iPhone はこのタイミングでしか再開できない）
  const unlock = () => {
    if (!ctx || ctx.state === 'running') return;
    ensureRunning().then((ok) => {
      if (!ok) return;
      // 無音を一瞬鳴らすと、iOS で確実に音が出るようになる
      const buf = ctx.createBuffer(1, 1, 22050);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      src.start(0);
    });
  };
  for (const ev of ['pointerdown', 'touchend', 'keydown']) {
    window.addEventListener(ev, unlock, { capture: true, passive: true });
  }
  // アプリにもどってきたとき・ページが復元されたとき
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') unlock();
  });
  window.addEventListener('pageshow', unlock);

  function tone(ac, freq, start, duration, type = 'sine', volume = 0.2, endFreq = null) {
    const t = ac.currentTime + 0.01 + start;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, t + duration);
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.connect(gain).connect(ac.destination);
    osc.start(t);
    osc.stop(t + duration + 0.02);
  }

  // ファミコン風の音（音の長さの間は同じ大きさで鳴らし、最後だけすっと消す）
  function chip(ac, freq, start, duration, type = 'square', volume = 0.08) {
    const t = ac.currentTime + 0.01 + start;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(volume, t);
    gain.gain.setValueAtTime(volume, t + duration * 0.8);
    gain.gain.linearRampToValueAtTime(0.0001, t + duration);
    osc.connect(gain).connect(ac.destination);
    osc.start(t);
    osc.stop(t + duration + 0.02);
  }

  // 音の高さ（Hz）
  const N = {
    C3: 130.81, G3: 196.0, C4: 261.63, G4: 392.0,
    C5: 523.25, E5: 659.25, G5: 783.99, A5: 880.0, B5: 987.77,
    C6: 1046.5, D6: 1174.66, E6: 1318.51,
  };

  // 音声が動いていることを確かめてから鳴らす
  const play = (fn) => () => {
    if (!isEnabled()) return;
    const ac = audio();
    if (!ac) return;
    if (ac.state === 'running') fn(ac);
    else ensureRunning().then((ok) => ok && fn(ac));
  };

  return {
    // ボタンを押したときの音
    tap: play((ac) => {
      tone(ac, 1100, 0, 0.07, 'sine', 0.14, 1500);
    }),
    back: play((ac) => {
      tone(ac, 700, 0, 0.09, 'sine', 0.14, 420);
    }),
    boing: play((ac) => {
      tone(ac, 380, 0, 0.18, 'triangle', 0.18, 900);
      tone(ac, 900, 0.14, 0.12, 'triangle', 0.1, 650);
    }),
    correct: play((ac) => {
      tone(ac, 880, 0, 0.15, 'triangle');
      tone(ac, 1318.5, 0.12, 0.3, 'triangle');
    }),
    wrong: play((ac) => {
      tone(ac, 220, 0, 0.18, 'square', 0.08);
      tone(ac, 185, 0.16, 0.3, 'square', 0.08);
    }),
    // 進化中の点めつ。step が進むほど音が高くなり、期待がふくらむ
    flash: (step = 0) => play((ac) => {
      chip(ac, 440 * 2 ** (step / 4), 0, 0.07, 'square', 0.06);
    })(),
    // 進化したときのファンファーレ（レトロゲームのレベルアップ風・オリジナル曲）
    evolve: play((ac) => {
      const melody = [
        [N.C5, 0.0, 0.1], [N.E5, 0.1, 0.1], [N.G5, 0.2, 0.1], [N.C6, 0.3, 0.25],
        [N.A5, 0.6, 0.1], [N.B5, 0.7, 0.1], [N.C6, 0.8, 0.1], [N.D6, 0.9, 0.25],
        [N.E6, 1.2, 0.8],
      ];
      melody.forEach(([f, s, d]) => chip(ac, f, s, d, 'square', 0.07));
      // ハモり（さいごの和音）
      chip(ac, N.G5, 1.2, 0.8, 'square', 0.045);
      chip(ac, N.C6, 1.2, 0.8, 'square', 0.035);
      // ベース
      [[N.C3, 0.0, 0.28], [N.G3, 0.3, 0.28], [N.G3, 0.6, 0.28], [N.G4 / 2, 0.9, 0.28], [N.C3, 1.2, 0.8], [N.C4, 1.2, 0.8]]
        .forEach(([f, s, d]) => chip(ac, f, s, d, 'triangle', 0.16));
    }),
    fanfare: play((ac) => {
      [523.3, 659.3, 784, 1046.5].forEach((f, i) => tone(ac, f, i * 0.12, 0.35, 'triangle', 0.15));
    }),
  };
}
