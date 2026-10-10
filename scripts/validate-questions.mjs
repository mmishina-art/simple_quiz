// 問題データのチェック: node scripts/validate-questions.mjs
import { schoolSubjects, schoolQuestions } from '../js/data/school.js';
import { triviaCategories, triviaQuestions } from '../js/data/trivia.js';

const errors = [];
let count = 0;

function check(mode, categories, questions, { needsGrade }) {
  const ids = categories.map((c) => c.id);
  for (const id of Object.keys(questions)) {
    if (!ids.includes(id)) errors.push(`${mode}: カテゴリ "${id}" が categories にありません`);
  }
  for (const id of ids) {
    const list = questions[id];
    if (!Array.isArray(list) || list.length === 0) {
      errors.push(`${mode}:${id} に問題がありません`);
      continue;
    }
    const seen = new Set();
    list.forEach((q, i) => {
      const where = `${mode}:${id}:${i}「${q.q}」`;
      count++;
      if (typeof q.q !== 'string' || !q.q.trim()) errors.push(`${where} 問題文がありません`);
      if (seen.has(q.q)) errors.push(`${where} 同じ問題文がもう1つあります`);
      seen.add(q.q);
      if (!Array.isArray(q.choices) || q.choices.length !== 4) errors.push(`${where} 選択肢は4つ必要です`);
      else if (new Set(q.choices).size !== 4) errors.push(`${where} 選択肢が重複しています`);
      if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer > 3) errors.push(`${where} answer は 0〜3 にしてください`);
      if (typeof q.explain !== 'string' || !q.explain.trim()) errors.push(`${where} 解説（explain）がありません`);
      if (needsGrade && !Number.isInteger(q.grade)) errors.push(`${where} grade（学年）がありません`);
    });
  }
}

check('school', schoolSubjects, schoolQuestions, { needsGrade: true });
check('trivia', triviaCategories, triviaQuestions, { needsGrade: false });

if (errors.length) {
  console.error(errors.join('\n'));
  console.error(`\n${errors.length} 件のエラー`);
  process.exit(1);
}
console.log(`OK: ${count} 問`);
