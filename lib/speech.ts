// 음성 재생 헬퍼.
// 우선순위: 녹음 오디오 파일(있으면) → 브라우저 TTS(없으면).
// 나중에 Word.audioKo/audioEn 에 경로만 채우면 자동으로 녹음이 우선된다.

let voicesCache: SpeechSynthesisVoice[] = [];

// 음성목록을 동기로 갱신. (iOS는 재생 직전 await 하면 제스처가 끊겨 차단되므로 미리 채워둔다)
function refreshVoices() {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  const v = window.speechSynthesis.getVoices();
  if (v.length) voicesCache = v;
}

// 모듈 로드 시 + 비동기 로드 완료 시 미리 받아둔다.
if (typeof window !== "undefined" && window.speechSynthesis) {
  refreshVoices();
  try {
    window.speechSynthesis.addEventListener("voiceschanged", refreshVoices);
  } catch {
    window.speechSynthesis.onvoiceschanged = refreshVoices;
  }
}

// iOS는 첫 사용자 제스처 때 음성 엔진을 깨워야 이후 자동재생도 소리가 난다.
let unlocked = false;
function unlockSpeech() {
  if (unlocked || typeof window === "undefined" || !window.speechSynthesis) return;
  unlocked = true;
  refreshVoices();
  try {
    const u = new SpeechSynthesisUtterance(" ");
    u.volume = 0;
    window.speechSynthesis.speak(u);
  } catch {
    // noop
  }
}
if (typeof window !== "undefined") {
  window.addEventListener("pointerdown", unlockSpeech, { once: true });
  window.addEventListener("touchend", unlockSpeech, { once: true });
}

function pickVoice(voices: SpeechSynthesisVoice[], lang: string): SpeechSynthesisVoice | undefined {
  const prefix = lang.split("-")[0];
  return (
    voices.find((v) => v.lang === lang) ??
    voices.find((v) => v.lang.startsWith(prefix))
  );
}

// 텍스트 한 마디를 말하고, 끝나면 resolve. (await 없이 동기 호출 → iOS 제스처 유지)
function speakText(text: string, lang: "ko-KR" | "en-GB"): Promise<void> {
  return new Promise((resolve) => {
    const ss = typeof window !== "undefined" ? window.speechSynthesis : undefined;
    if (!ss) {
      resolve();
      return;
    }
    if (!voicesCache.length) refreshVoices();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    const v = pickVoice(voicesCache, lang);
    if (v) u.voice = v; // 없으면 u.lang 으로 브라우저 기본 음성 사용
    u.rate = 0.9; // 아이용으로 약간 천천히
    u.pitch = 1.1; // 살짝 밝게
    u.onend = () => resolve();
    u.onerror = () => resolve();
    ss.speak(u);
  });
}

// 녹음 파일이 있으면 그걸, 없으면 TTS 를 재생. 끝나면 resolve.
function playClip(src: string | undefined, text: string, lang: "ko-KR" | "en-GB"): Promise<void> {
  if (src) {
    return new Promise((resolve) => {
      const audio = new Audio(src);
      audio.onended = () => resolve();
      audio.onerror = () => resolve();
      audio.play().catch(() => resolve());
    });
  }
  return speakText(text, lang);
}

export function cancelSpeech() {
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

type SpeakableWord = { ko: string; en: string; audioKo?: string; audioEn?: string };

// 한국어 한 번.
export async function sayKo(w: SpeakableWord) {
  cancelSpeech();
  await playClip(w.audioKo, w.ko, "ko-KR");
}

// 영어 한 번.
export async function sayEn(w: SpeakableWord) {
  cancelSpeech();
  await playClip(w.audioEn, w.en, "en-GB");
}

// 병행: "사과" → (잠깐) → "apple" 연속 재생.
export async function sayBoth(w: SpeakableWord) {
  cancelSpeech();
  await playClip(w.audioKo, w.ko, "ko-KR");
  await new Promise((r) => setTimeout(r, 350));
  await playClip(w.audioEn, w.en, "en-GB");
}

// 임의 문장(게임 안내 등) 한국어로 말하기.
export async function saySentenceKo(text: string) {
  cancelSpeech();
  await speakText(text, "ko-KR");
}
