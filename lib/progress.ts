import { parseMathSettings, type MathSettings } from "./math";

export type Activity = "learn" | "listen" | "connect" | "write" | "stroke" | "math" | "daily";
export type LearningEvent = {
  id: string;
  at: number;
  activity: Activity;
  itemId: string;
  label: string;
  language?: "ko" | "en";
  correct?: boolean; // First-attempt result, not the eventual answer after retries.
  hints?: number;
  level?: number; // Retained for older activity history.
  mathOperation?: "+" | "−" | "×";
  mathRange?: number;
};
export type Progress = {
  version: 1;
  events: LearningEvent[];
  mathLevel: number;
  mathMode: "auto" | "manual";
  dailyDates: string[];
  mathSettings: MathSettings;
};
const KEY = "kidslearn.progress.v1";
const STAR_KEY = "kidslearn.stars";
const activities = new Set(["learn", "listen", "connect", "write", "stroke", "math", "daily"]);
const empty = (): Progress => ({ version: 1, events: [], mathLevel: 0, mathMode: "manual", dailyDates: [], mathSettings: parseMathSettings(null) });
let memory = empty();
let memoryStars = 0;
let starsUnavailable = false;
let unavailable = false;
export const localDay = (at = Date.now()) => {
  const d = new Date(at);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
export function parseProgress(raw: string | null): Progress {
  try {
    const p = JSON.parse(raw ?? "null");
    if (!p || p.version !== 1) return empty();
    return {
      version: 1,
      events: Array.isArray(p.events) ? p.events.filter((e: LearningEvent) =>
        e && typeof e.id === "string" && Number.isFinite(e.at) && e.at > 0 && activities.has(e.activity) &&
        typeof e.itemId === "string" && typeof e.label === "string" &&
        (e.language === undefined || e.language === "ko" || e.language === "en") &&
        (e.correct === undefined || typeof e.correct === "boolean") &&
        (e.hints === undefined || (Number.isInteger(e.hints) && e.hints >= 0)) &&
        (e.level === undefined || (Number.isInteger(e.level) && e.level >= 0 && e.level <= 2)) &&
        (e.mathOperation === undefined || ["+", "−", "×"].includes(e.mathOperation)) &&
        (e.mathRange === undefined || [10, 20, 50, 100].includes(e.mathRange))
      ).slice(-500) : [],
      mathLevel: Number.isInteger(p.mathLevel) ? Math.max(0, Math.min(2, p.mathLevel)) : 0,
      mathMode: p.mathSettings && p.mathMode === "auto" ? "auto" : "manual",
      mathSettings: parseMathSettings(p.mathSettings),
      dailyDates: Array.isArray(p.dailyDates) ? p.dailyDates.filter((d: unknown) => typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d)).slice(-365) : [],
    };
  } catch { return empty(); }
}
export function readProgress(): Progress {
  if (typeof window === "undefined") return empty();
  if (!unavailable) {
    try { memory = parseProgress(localStorage.getItem(KEY)); } catch { unavailable = true; }
  }
  return memory;
}
export function saveProgress(p: Progress) {
  memory = p;
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { unavailable = true; }
  if (typeof window !== "undefined") window.dispatchEvent(new Event("kidslearn-progress"));
}
export function storageAvailable() { return !unavailable; }
export function recordEvent(event: Omit<LearningEvent, "id" | "at">, id?: string) {
  const p = readProgress();
  if (id && p.events.some((e) => e.id === id)) return;
  const entry = { ...event, at: Date.now(), id: id ?? `${Date.now()}-${Math.random().toString(36).slice(2)}` };
  saveProgress({ ...p, events: [...p.events, entry].slice(-500) });
}
export function readStars() {
  if (starsUnavailable) return memoryStars;
  try {
    const n = Number(localStorage.getItem(STAR_KEY));
    memoryStars = Number.isSafeInteger(n) && n >= 0 ? n : 0;
  } catch { unavailable = true; starsUnavailable = true; }
  return memoryStars;
}
export function awardStar() {
  memoryStars = readStars() + 1;
  try { localStorage.setItem(STAR_KEY, String(memoryStars)); } catch { unavailable = true; starsUnavailable = true; }
  return memoryStars;
}
export function completeDaily(date: string) {
  const p = readProgress();
  if (p.dailyDates.includes(date)) return false;
  saveProgress({ ...p, dailyDates: [...p.dailyDates, date].slice(-365) });
  recordEvent({ activity: "daily", itemId: date, label: "오늘의 놀이 완성" }, `daily-${date}`);
  return true;
}
export function listeningChoiceCount(events: LearningEvent[], language: "ko" | "en") {
  const recent = events.filter((e) => e.activity === "listen" && e.language === language).slice(-6);
  const clean = recent.filter((e) => e.correct === true && !e.hints).length;
  return clean >= 5 ? 4 : clean >= 3 ? 3 : 2;
}
