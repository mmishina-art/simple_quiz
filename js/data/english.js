// えいごモードの問題データ（英検5級・4級レベル）
// レベルごとの問題は js/data/english/*.js にあります。
import eiken5 from './english/eiken5.js';
import eiken4 from './english/eiken4.js';

export const englishCategories = [
  { id: 'eiken5', name: '英検5級', icon: '🐣', color: '#3a86ff' },
  { id: 'eiken4', name: '英検4級', icon: '🐥', color: '#8338ec' },
];

export const englishQuestions = { eiken5, eiken4 };
