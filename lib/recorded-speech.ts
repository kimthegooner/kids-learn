import clips from "@/data/speech-clips.json";
import { BASE } from "./config";

export type SpeechLanguage = "ko-KR" | "en-GB";
export const SOUND_CHECK = "안녕! 소리가 들리면 같이 놀자.";
const catalog: Record<string,string> = clips;
const normalize = (text:string) => text.normalize("NFC").replace(/\s+/g," ").trim();
export function recordedSequence(text:string, lang:SpeechLanguage): string[] | null {
  const lookup=(value:string)=>catalog[`${lang}:${normalize(value)}`];
  const exact=lookup(text);
  if(exact) return [BASE+exact];
  if(lang!=="ko-KR") return null;
  const writing=text.match(/^(.+)\. 초록 점에서 시작해서 써 보자\.$/);
  const parts=writing ? [writing[1],"초록 점에서 시작해서 써 보자."] : text.split(/(\d+|[+−×]|더하기|빼기|곱하기)/g);
  const operators:Record<string,string>={"+":"더하기","−":"빼기","×":"곱하기"};
  const meaningful=parts.map(p=>operators[p]??normalize(p)).filter(p=>/[\p{L}\p{N}]/u.test(p));
  const paths=meaningful.map(lookup);
  return paths.length && paths.every(Boolean) ? paths.map(p=>BASE+p) : null;
}
