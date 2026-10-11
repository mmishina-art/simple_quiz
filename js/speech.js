// 英語の読み上げ（スマホやパソコンに入っている音声を使います。インターネットは不要）

const BLANK = /\(\s*\)/; // 穴うめの「(   )」

export function canSpeak() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';
}

let voice = null;
function pickVoice() {
  const voices = speechSynthesis.getVoices().filter((v) => /^en(-|_|$)/i.test(v.lang));
  // アメリカ英語 → イギリス英語 → そのほかの英語 の順にえらぶ
  voice = voices.find((v) => /en[-_]US/i.test(v.lang) && v.localService)
    ?? voices.find((v) => /en[-_]US/i.test(v.lang))
    ?? voices.find((v) => /en[-_]GB/i.test(v.lang))
    ?? voices[0] ?? null;
}
if (canSpeak()) {
  pickVoice();
  speechSynthesis.addEventListener?.('voiceschanged', pickVoice);
}

export function speak(text, { rate = 0.85 } = {}) {
  if (!canSpeak() || !text) return;
  speechSynthesis.cancel(); // 前の読み上げを止めてから
  const u = new SpeechSynthesisUtterance(text);
  u.lang = voice?.lang ?? 'en-US';
  if (voice) u.voice = voice;
  u.rate = rate;
  speechSynthesis.speak(u);
}

export function stopSpeaking() {
  if (canSpeak()) speechSynthesis.cancel();
}

// 英語らしい文字列か（アルファベットが2文字以上ある）
export const isEnglish = (s) => /[A-Za-z].*[A-Za-z]/.test(s ?? '') && !/[ぁ-んァ-ン一-龯]/.test(s ?? '');

// 問題文から、読み上げる英語の部分をとり出す。
//   'I (   ) a student.　（ ）に入るのは？' → 'I (   ) a student.'
//   '「apple」の意味は？' → 'apple'
//   'Do you like music? ― Yes, I (   ).　（ ）に入るのは？' → 'Do you like music? ― Yes, I (   ).'
function englishPart(q) {
  if (/[①-④]/.test(q)) return ''; // 並べかえ問題は、語句がばらばらなので読まない
  const quoted = q.match(/「([^」]*[A-Za-z][^」]*)」/);
  if (quoted && !/[ぁ-んァ-ン一-龯]/.test(quoted[1])) return quoted[1];
  const segs = q.match(/[A-Za-z0-9'".,!?()\s―—\-:]*[A-Za-z][A-Za-z0-9'".,!?()\s―—\-:]*/g) ?? [];
  return segs.map((s) => s.trim()).filter((s) => /[A-Za-z]{2,}/.test(s)).sort((a, b) => b.length - a.length)[0] ?? '';
}

// 読み上げ用に整える（穴は「…」で少し間をあける、記号を読みやすく）
function tidy(text) {
  return text.replace(BLANK, ', ... ,').replace(/[―—]/g, '. ').replace(/\s+/g, ' ').trim();
}

// 答える前に読む文
export function questionSpeech(q) {
  const part = englishPart(q.q);
  return part ? tidy(part) : '';
}

// 答えたあとに読む文（穴を正解でうめる。英語の正解だけのときは正解を読む）
export function answerSpeech(q, answerText) {
  const part = englishPart(q.q);
  if (/[①-④]/.test(q.q)) return '';
  if (part && BLANK.test(part) && isEnglish(answerText)) {
    return tidy(part.replace(BLANK, answerText));
  }
  // 会話（「Thank you.」への返事など）や反対の意味の単語は、問題の英語 → 正解 の順に読む
  if (part && isEnglish(answerText) && part !== answerText) return `${tidy(part)} ... ${answerText}`;
  if (isEnglish(answerText)) return answerText;
  return part ? tidy(part) : '';
}
