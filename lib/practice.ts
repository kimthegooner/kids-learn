import { WORDS, type Word } from "./words";
import { localDay, type LearningEvent } from "./progress";

export function practiceWords(pool: Word[], events: LearningEvent[], count: number, seed = localDay(), language: "ko" | "en" = "ko"): Word[] {
  const hash = (value: string) => [...value].reduce((n, ch) => (Math.imul(n, 31) + ch.charCodeAt(0)) >>> 0, 7);
  const priority = (w: Word) => {
    const recent = events.filter((e) => e.itemId === w.id && e.language === language).slice(-3);
    const lastQuiz = recent.filter((e) => e.correct !== undefined).at(-1);
    if (lastQuiz && (lastQuiz.correct === false || lastQuiz.hints)) return 0;
    return recent.length ? 2 : 1;
  };
  return [...pool].sort((a, b) => priority(a) - priority(b) || hash(seed + a.id) - hash(seed + b.id)).slice(0, count);
}
export function dailyWords(events: LearningEvent[], day = localDay()) {
  return practiceWords(WORDS.filter((w) => !(["soccer", "footballers"].includes(w.category)) && [...w.ko].length <= 3), events, 3, day);
}

// A child must be able to distinguish choices using the picture and spoken word.
// Homonyms (배/배, 눈/눈), shared fallback emoji, and broad/specific pairs such as
// flower/rose must not appear as competing answers in the same question.
export function canPairChoices(a: Word, b: Word) {
  return a.id !== b.id && a.ko !== b.ko && a.en.toLowerCase() !== b.en.toLowerCase() &&
    a.emoji !== b.emoji && !(a.quizGroup && a.quizGroup === b.quizGroup);
}
export function distinctChoices(target: Word, candidates: Word[], count: number): Word[] {
  const result = [target];
  for (const candidate of candidates) {
    if (result.length >= count) break;
    if (result.every((word) => canPairChoices(word, candidate))) result.push(candidate);
  }
  return result;
}
