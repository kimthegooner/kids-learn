// A language hint alone can fall back to a device's US/default voice.
export function britishVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | undefined {
  return voices.find(voice => /^en-gb(?:-|$)/i.test(voice.lang.replace(/_/g, "-")));
}

export function waitForBritishVoice(speech: SpeechSynthesis, signal: AbortSignal): Promise<SpeechSynthesisVoice | undefined> {
  return new Promise(resolve => {
    if (signal.aborted) return resolve(undefined);
    const available = britishVoice(speech.getVoices());
    if (available) return resolve(available);
    let settled = false;
    const finish = (voice?: SpeechSynthesisVoice) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      speech.removeEventListener("voiceschanged", changed);
      signal.removeEventListener("abort", abort);
      resolve(voice);
    };
    const changed = () => {
      const voice = britishVoice(speech.getVoices());
      if (voice) finish(voice);
    };
    const abort = () => finish();
    const timer = setTimeout(() => finish(britishVoice(speech.getVoices())), 1500);
    speech.addEventListener("voiceschanged", changed);
    signal.addEventListener("abort", abort, { once: true });
    changed();
  });
}
