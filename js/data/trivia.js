// 雑学モードの問題データ
// 分野ごとの問題は js/data/trivia/*.js にあります。
import ikimono from './trivia/ikimono.js';
import sekai from './trivia/sekai.js';
import kurashi from './trivia/kurashi.js';
import sports from './trivia/sports.js';

export const triviaCategories = [
  { id: 'ikimono', name: 'いきもの', icon: '🐼', color: '#2bb673' },
  { id: 'sekai', name: '世界・宇宙', icon: '🌏', color: '#3a86ff' },
  { id: 'kurashi', name: 'からだ・くらし', icon: '🏠', color: '#f4a261' },
  { id: 'sports', name: 'スポーツ・あそび', icon: '⚽', color: '#e8505b' },
];

export const triviaQuestions = { ikimono, sekai, kurashi, sports };
