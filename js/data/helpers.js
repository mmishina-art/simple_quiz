// 問題を短く書くためのヘルパー。choices の先頭が正解（表示するときにシャッフルされます）。
export const Q = (q, choices, explain) => ({ q, choices, answer: 0, explain });

// 学年つきの問題（テスト対策モード用）
export const grade = (g) => (q, choices, explain) => ({ grade: g, ...Q(q, choices, explain) });
