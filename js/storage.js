const KEY = 'simple-quiz:v1';

const defaults = () => ({
  sound: true,
  best: {}, // { "school:sansu": 9, ... }
  mistakes: [], // まちがえた問題のID（ふくしゅう用）
  solved: [], // 5教科で一度でも正解した問題のID（キャラの成長用）
  stageSeen: 0, // 進化の演出を見せたところまでの段階
  charaName: 'ピコ',
});

export function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    return { ...defaults(), ...(saved && typeof saved === 'object' ? saved : {}) };
  } catch {
    return defaults();
  }
}

export function saveState(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // プライベートモードなどで保存できなくても、ゲームは続けられるようにする
  }
}
