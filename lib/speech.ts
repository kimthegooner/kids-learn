// 음성 재생 헬퍼.
// 우선순위: 녹음 오디오 파일(있으면) → 브라우저 TTS(없으면).
// 나중에 Word.audioKo/audioEn 에 경로만 채우면 자동으로 녹음이 우선된다.

let voicesCache: SpeechSynthesisVoice[] = [];

function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      resolve([]);
      return;
    }
    const existing = window.speechSynthesis.getVoices();
    if (existing.length > 0) {
      voicesCache = existing;
      resolve(existing);
      return;
    }
    // 일부 브라우저는 voices 를 비동기로 로드한다.
    const handler = () => {
      voicesCache = window.speechSynthesis.getVoices();
      resolve(voicesCache);
    };
    window.speechSynthesis.onvoiceschanged = handler;
    // 안전장치: 1초 후엔 가진 것으로라도 진행
    setTimeout(() => resolve(window.speechSynthesis.getVoices()), 1000);
  });
}

function pickVoice(voices: SpeechSynthesisVoice[], lang: string): SpeechSynthesisVoice | undefined {
  const prefix = lang.split("-")[0];
  return (
    voices.find((v) => v.lang === lang) ??
    voices.find((v) => v.lang.startsWith(prefix))
  );
}

// 텍스트 한 마디를 말하고, 끝나면 resolve.
function speakText(text: string, lang: "ko-KR" | "en-GB"): Promise<void> {
  return new Promise(async (resolve) => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      resolve();
      return;
    }
    const voices = voicesCache.length ? voicesCache : await loadVoices();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    const v = pickVoice(voices, lang);
    if (v) u.voice = v;
    u.rate = 0.85; // 아이용으로 약간 천천히
    u.pitch = 1.1; // 살짝 밝게
    u.onend = () => resolve();
    u.onerror = () => resolve();
    window.speechSynthesis.speak(u);
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
