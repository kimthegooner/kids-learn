import type { LearningEvent } from "./progress";

export type MathOperation = "add" | "subtract" | "multiply" | "mixed";
export type MathSettings = {
  operation: MathOperation;
  range: 10 | 20 | 50 | 100;
  tables: number[];
  answerMode: "input" | "choices";
  questions: 5 | 10;
};
export const DEFAULT_MATH: MathSettings = { operation: "mixed", range: 20, tables: [2, 3, 4, 5], answerMode: "input", questions: 10 };
export const MATH_OPERATIONS = [
  { id: "add", label: "덧셈", symbol: "+" },
  { id: "subtract", label: "뺄셈", symbol: "−" },
  { id: "multiply", label: "곱셈", symbol: "×" },
  { id: "mixed", label: "섞어서", symbol: "+ − ×" },
] as const;
export const MATH_RANGES = [10, 20, 50, 100] as const;
export type Problem = { a: number; b: number; op: "+" | "−" | "×"; answer: number; range: number };
const integer = (max: number, random: () => number) => Math.floor(random() * max);
export function parseMathSettings(raw: unknown): MathSettings {
  const p = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
  const tables = Array.isArray(p.tables) ? [...new Set(p.tables.filter((n): n is number => typeof n === "number" && Number.isInteger(n) && n >= 2 && n <= 9))].sort((a,b) => a-b) : [];
  return {
    operation: MATH_OPERATIONS.some((o) => o.id === p.operation) ? p.operation as MathOperation : DEFAULT_MATH.operation,
    range: MATH_RANGES.includes(p.range as 10) ? p.range as MathSettings["range"] : DEFAULT_MATH.range,
    tables: tables.length ? tables : [...DEFAULT_MATH.tables],
    answerMode: p.answerMode === "choices" ? "choices" : "input",
    questions: p.questions === 5 ? 5 : 10,
  };
}
export function makeProblem(settings: MathSettings, random = Math.random, round = 0): Problem {
  const operation = settings.operation === "mixed" ? (["add", "subtract", "multiply"] as const)[round % 3] : settings.operation;
  const range = settings.range;
  if (operation === "multiply") {
    const a = settings.tables[integer(settings.tables.length, random)];
    const b = 1 + integer(9, random);
    return { a, b, op: "×", answer: a * b, range };
  }
  // The selected upper range drives the work: 20-level practice includes teen
  // numbers, rather than repeatedly returning to 1 + 1.
  const high = Math.floor(range / 2) + 1 + integer(Math.ceil(range / 2), random);
  if (operation === "add") {
    const a = 2 + integer(high - 3, random);
    return { a, b: high - a, op: "+", answer: high, range };
  }
  const b = 1 + integer(high, random);
  return { a: high, b, op: "−", answer: high - b, range };
}
export function makeOptions(answer: number, max: number, random = Math.random): number[] {
  const others = Array.from({ length: max + 1 }, (_, i) => i).filter((n) => n !== answer && Math.abs(n - answer) <= 12);
  for (let i = others.length - 1; i > 0; i--) {
    const j = integer(i + 1, random);
    [others[i], others[j]] = [others[j], others[i]];
  }
  const options = [answer, ...others.slice(0, 3)];
  for (let i = options.length - 1; i > 0; i--) {
    const j = integer(i + 1, random);
    [options[i], options[j]] = [options[j], options[i]];
  }
  return options;
}
export function recommendedMathRange(events: LearningEvent[], current: MathSettings["range"]): MathSettings["range"] {
  const recent = events.filter((e) => e.activity === "math" && (e.mathOperation === "+" || e.mathOperation === "−")).slice(-5);
  if (recent.length === 5 && recent.every((e) => e.mathRange === current && e.correct === true && !e.hints)) {
    return MATH_RANGES[Math.min(MATH_RANGES.length - 1, MATH_RANGES.indexOf(current) + 1)];
  }
  return current;
}
export function problemLabel(p: Problem) { return `${p.a} ${p.op} ${p.b}`; }
export function mathHint(p: Problem) {
  if (p.op === "×") return `${p.a}개씩 ${p.b}묶음이야. ${Array.from({length:p.b}, () => p.a).join(" + ")}는 얼마일까?`;
  const units = p.a % 10;
  if (p.op === "+" && units && units + p.b > 10) return `더할 수를 ${10 - units}, ${p.b - (10 - units)} 두 부분으로 나눠 봐. ${p.a} + ${10 - units} + ${p.b - (10 - units)} 순서로 계산해 보자.`;
  if (p.op === "−" && units && p.b > units) return `먼저 ${p.a} − ${units}부터 계산해 봐. 그다음 ${p.a - units} − ${p.b - units}에 도전해 보자.`;
  return p.op === "+" ? `${p.a}에서 ${p.b}만큼 더해 봐. 십의 자리와 일의 자리를 나누어 생각해도 좋아.` : `${p.a}에서 ${p.b}만큼 빼 봐. 십의 자리와 일의 자리를 나누어 생각해도 좋아.`;
}
