// テスト対策モード（学校の勉強）の問題データ
// 教科ごとの問題は js/data/school/*.js にあります。
import kokugo from './school/kokugo.js';
import sansu from './school/sansu.js';
import sansuMore from './school/sansu-more.js';
import rika from './school/rika.js';
import shakai from './school/shakai.js';
import shakaiMore from './school/shakai-more.js';

export const schoolSubjects = [
  { id: 'kokugo', name: '国語', icon: '📖', color: '#e8505b' },
  { id: 'sansu', name: '算数', icon: '🔢', color: '#3a86ff' },
  { id: 'rika', name: '理科', icon: '🔬', color: '#2bb673' },
  { id: 'shakai', name: '社会', icon: '🗾', color: '#f4a261' },
];

// 追加分は配列の最後につなげる（問題のIDがずれないように）
export const schoolQuestions = {
  kokugo,
  sansu: [...sansu, ...sansuMore],
  rika,
  shakai: [...shakai, ...shakaiMore],
};
