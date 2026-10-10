// 問題データのチェック: node scripts/validate-questions.mjs
import { readFileSync, readdirSync } from 'node:fs';
import { schoolSubjects, schoolQuestions } from '../js/data/school.js';
import { triviaCategories, triviaQuestions } from '../js/data/trivia.js';
import { englishCategories, englishQuestions } from '../js/data/english.js';

const errors = [];
const summary = [];

function check(mode, categories, questions, { needsGrade }) {
  const ids = categories.map((c) => c.id);
  for (const id of Object.keys(questions)) {
    if (!ids.includes(id)) errors.push(`${mode}: カテゴリ "${id}" が categories にありません`);
  }
  const seen = new Map(); // 同じモードの中で問題文がかぶっていないか
  for (const id of ids) {
    const list = questions[id];
    if (!Array.isArray(list) || list.length === 0) {
      errors.push(`${mode}:${id} に問題がありません`);
      continue;
    }
    summary.push(`${mode}:${id} ${list.length}問`);
    list.forEach((q, i) => {
      const where = `${mode}:${id}:${i}「${q.q}」`;
      if (typeof q.q !== 'string' || !q.q.trim()) errors.push(`${where} 問題文がありません`);
      if (seen.has(q.q)) errors.push(`${where} 同じ問題文が ${seen.get(q.q)} にもあります`);
      seen.set(q.q, `${mode}:${id}:${i}`);
      if (!Array.isArray(q.choices) || q.choices.length !== 4) errors.push(`${where} 選択肢は4つ必要です`);
      else {
        if (new Set(q.choices).size !== 4) errors.push(`${where} 選択肢が重複しています`);
        if (q.choices.some((c) => typeof c !== 'string' || !c.trim())) errors.push(`${where} 空の選択肢があります`);
      }
      if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer > 3) errors.push(`${where} answer は 0〜3 にしてください`);
      if (typeof q.explain !== 'string' || !q.explain.trim()) errors.push(`${where} 解説（explain）がありません`);
      if (needsGrade && !Number.isInteger(q.grade)) errors.push(`${where} grade（学年）がありません`);
    });
  }
}

check('school', schoolSubjects, schoolQuestions, { needsGrade: true });
check('trivia', triviaCategories, triviaQuestions, { needsGrade: false });
check('english', englishCategories, englishQuestions, { needsGrade: false });

// Service Worker のキャッシュ一覧に、データファイルがもれなく入っているか
const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
for (const dir of ['', 'data/', 'data/school/', 'data/trivia/', 'data/english/']) {
  for (const f of readdirSync(new URL(`../js/${dir}`, import.meta.url))) {
    if (f.endsWith('.js') && !sw.includes(`'./js/${dir}${f}'`)) errors.push(`sw.js の APP_SHELL に ./js/${dir}${f} がありません`);
  }
}

console.log(summary.join('\n'));
if (errors.length) {
  console.error('\n' + errors.join('\n'));
  console.error(`\n${errors.length} 件のエラー`);
  process.exit(1);
}
const total = summary.reduce((n, s) => n + Number(s.match(/(\d+)問/)[1]), 0);
console.log(`\nOK: 合計 ${total} 問`);
