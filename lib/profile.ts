export type ChildProfile = { name: string; englishName: string };
export const PROFILE_KEY = "kidslearn.profile.v1";
export const EMPTY_PROFILE: ChildProfile = { name: "", englishName: "" };
export const NAME_LIMIT = 16;
let memory: ChildProfile | null = null;
let unavailable = false;

export function cleanName(value: unknown, limit = NAME_LIMIT) {
  if (typeof value !== "string") return "";
  return [...value.normalize("NFC").replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2066-\u2069]/g, "").replace(/\s+/g, " ").trim()].slice(0, limit).join("");
}

export function parseProfile(raw: string | null): ChildProfile | null {
  try {
    const data = JSON.parse(raw ?? "null");
    if (!data || data.version !== 1 || typeof data.name !== "string" || typeof data.englishName !== "string") return null;
    const name = cleanName(data.name);
    return { name, englishName: name ? cleanName(data.englishName, 30) : "" };
  } catch { return null; }
}

export function readProfile() {
  if (typeof window === "undefined") return null;
  if (!unavailable) {
    try { memory = parseProfile(localStorage.getItem(PROFILE_KEY)); }
    catch { unavailable = true; }
  }
  return memory;
}

export function saveProfile(profile: ChildProfile) {
  const name = cleanName(profile.name);
  memory = { name, englishName: name ? cleanName(profile.englishName, 30) : "" };
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify({ version: 1, ...memory }));
    unavailable = false;
  } catch { unavailable = true; }
  window.dispatchEvent(new Event("kidslearn-profile"));
  return !unavailable;
}

export function forestTitle(name: string) { return `${name || "우리"}의 배움 숲`; }
export function greeting(name: string) {
  if (!name) return "친구야";
  const last = name.charCodeAt(name.length - 1);
  if (last >= 0xac00 && last <= 0xd7a3) return `${name}${(last - 0xac00) % 28 ? "아" : "야"}`;
  return `안녕, ${name}`;
}
export function introduction(profile: ChildProfile) {
  if (!profile.name) return { ko: "네 이름은 뭐야?", en: "What is your name?" };
  return { ko: `내 이름은 ${profile.name}!`, en: `My name is ${profile.englishName || profile.name}.` };
}
export function photoTitle(name: string) { return `${name || "우리"}의 변신 사진관`; }
export function photoFilename(name: string, filter: string) {
  const safe = name.replace(/[<>:"/\\|?*]/g, "").trim();
  return `${safe || "우리"}의-변신-${filter}.png`;
}
