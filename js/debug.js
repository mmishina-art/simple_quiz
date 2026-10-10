// デバッグモード：キャラの成長や進化の演出を確かめるための画面（ホームの下に出ます）
//   オン：URL に ?debug をつけて開く ／ タイトル「4たくクイズ」を7回つづけてタップ
//   オフ：もう一度タイトルを7回タップ ／ ?debug=0 をつけて開く
import { STAGES, MAX_STAGE, THRESHOLDS } from './chara.js';

const KEY = 'simple-quiz:debug';
const MOODS = [['normal', 'ふつう'], ['happy', 'よろこぶ'], ['sad', 'かなしむ'], ['cheer', 'おうえん']];

function isOn() {
  try { return localStorage.getItem(KEY) === '1'; } catch { return false; }
}
function setOn(on) {
  try { on ? localStorage.setItem(KEY, '1') : localStorage.removeItem(KEY); } catch { /* 保存できなくても続ける */ }
}

export function initDebug(app) {
  const params = new URLSearchParams(location.search);
  if (params.has('debug')) setOn(params.get('debug') !== '0');

  // タイトルを7回つづけてタップで切りかえ
  let taps = 0;
  let tapTimer = null;
  document.querySelector('.hero h1').addEventListener('click', () => {
    taps++;
    clearTimeout(tapTimer);
    tapTimer = setTimeout(() => { taps = 0; }, 1500);
    if (taps >= 7) {
      taps = 0;
      setOn(!isOn());
      render();
      alert(isOn() ? 'デバッグモードをオンにしました（ホームのいちばん下）' : 'デバッグモードをオフにしました');
    }
  });

  let preview = { stage: null, mood: 'normal' };

  function render() {
    document.querySelector('#debug-panel')?.remove();
    if (!isOn()) return;
    const g = app.growth();
    const panel = document.createElement('section');
    panel.id = 'debug-panel';
    panel.className = 'debug-panel';
    const btn = (label, onClick, cls = '') => {
      const b = document.createElement('button');
      b.textContent = label;
      b.className = `debug-btn ${cls}`;
      b.addEventListener('click', onClick);
      return b;
    };
    const row = (title, ...children) => {
      const div = document.createElement('div');
      div.className = 'debug-row';
      const h = document.createElement('p');
      h.className = 'debug-title';
      h.textContent = title;
      div.append(h, ...children);
      return div;
    };
    const wrap = (...children) => {
      const d = document.createElement('div');
      d.className = 'debug-btns';
      d.append(...children);
      return d;
    };

    const head = document.createElement('p');
    head.className = 'debug-head';
    head.textContent = `🛠 デバッグモード　正解ずみ ${g.solved} / ${g.total}問（${(g.rate * 100).toFixed(1)}%）・表示中 Lv.${g.shown}・計算上 Lv.${g.stage}`;

    // 1. すがたを見る（記録は変わらない）
    const stages = wrap(...STAGES.map((_, i) => btn(`Lv.${i}`, () => {
      preview.stage = i;
      showPreview();
    }, preview.stage === i ? 'on' : '')));
    const moods = wrap(...MOODS.map(([m, label]) => btn(label, () => {
      preview.mood = m;
      if (preview.stage == null) preview.stage = g.shown;
      showPreview();
    }, preview.mood === m ? 'on' : '')), btn('もとにもどす', () => {
      preview = { stage: null, mood: 'normal' };
      app.renderHomeBuddy();
      render();
    }));

    // 2. 進化の演出を見る（記録は変わらない）
    const evos = wrap(...STAGES.slice(1).map((_, i) => btn(`→Lv.${i + 1}`, () => {
      app.playEvolution(i, i + 1, { save: false }).then(render);
    })));

    // 3. 成長を進める（記録が変わる）
    const addSolved = (n) => {
      const solved = new Set(app.state.solved);
      for (const id of app.growthIds) {
        if (n <= 0) break;
        if (!solved.has(id)) { app.state.solved.push(id); solved.add(id); n--; }
      }
      app.saveState(app.state);
      app.renderHomeBuddy();
      render();
      app.checkEvolution().then(render);
    };
    // ボタンを押した時点の最新の数字で計算する
    const need = (stage) => Math.ceil((app.growth().total * THRESHOLDS[stage]) / 100 - 1e-9);
    const nextStage = () => Math.min(MAX_STAGE, app.growth().shown + 1);
    const next = nextStage();
    const grow = wrap(
      btn('+1問', () => addSolved(1)),
      btn('+10問', () => addSolved(10)),
      btn(`進化の1問前まで（Lv.${next}）`, () => addSolved(need(nextStage()) - 1 - app.growth().solved)),
      btn(`つぎの進化まで（Lv.${next}）`, () => addSolved(need(nextStage()) - app.growth().solved)),
      btn('Lv.0 にもどす', () => {
        if (!confirm('成長の記録（正解ずみの問題と進化）をリセットします。いいですか？')) return;
        app.state.solved = [];
        app.state.stageSeen = 0;
        app.saveState(app.state);
        preview = { stage: null, mood: 'normal' };
        app.renderHomeBuddy();
        render();
      }, 'danger'),
    );

    panel.append(
      head,
      row('すがたを見る（記録は変わりません）', stages, moods),
      row('進化の演出を見る（記録は変わりません）', evos),
      row('成長を進める（⚠️ 記録が変わります）', grow),
      wrap(btn('デバッグモードをオフにする', () => { setOn(false); render(); app.renderHomeBuddy(); })),
    );
    document.querySelector('#screen-home').append(panel);
  }

  function showPreview() {
    const chara = document.querySelector('#home-chara');
    app.setChara(chara, preview.stage, preview.mood);
    document.querySelector('#chara-level').textContent = `${preview.stage}（プレビュー）`;
    document.querySelector('#chara-stage').textContent = STAGES[preview.stage].name;
    if (preview.mood !== 'normal') {
      const kind = preview.mood === 'happy' ? 'happy' : preview.mood === 'sad' ? 'sad' : 'cheer';
      app.say(document.querySelector('#home-bubble'), app.line(kind, preview.stage), 1600);
    }
    render();
  }

  // ホームに来るたびに数字を新しくする
  const home = document.querySelector('#screen-home');
  new MutationObserver(() => { if (home.classList.contains('active')) { preview = { stage: null, mood: 'normal' }; render(); } })
    .observe(home, { attributes: true, attributeFilter: ['class'] });
  render();
}
