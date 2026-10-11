// えいごモードの問題データ（英検5級・4級レベル）
// レベルごとの問題は js/data/english/*.js にあります。
import eiken5 from './english/eiken5.js';
import eiken5more from './english/eiken5-more.js';
import eiken4 from './english/eiken4.js';

export const englishCategories = [
  { id: 'eiken5', name: '英検5級', icon: '🐣', color: '#3a86ff' },
  { id: 'eiken4', name: '英検4級', icon: '🐥', color: '#8338ec' },
];

// 追加分は配列の最後につなげる（問題のIDがずれないように）
export const englishQuestions = { eiken5: [...eiken5, ...eiken5more], eiken4 };
