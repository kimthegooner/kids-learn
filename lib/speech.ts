import { recordedSequence, SOUND_CHECK, type SpeechLanguage } from "./recorded-speech";
import { britishVoice, waitForBritishVoice } from "./british-voice";

type Playback = (signal:AbortSignal)=>Promise<boolean>;
type ClipResult = "complete" | "aborted" | "blocked" | "failed";
export type SoundState = "idle" | "playing" | "ready" | "blocked" | "unavailable" | "british-unavailable" | "error";
let state:SoundState="idle";
const listeners=new Set<()=>void>();
export const getSoundState=()=>state;
export const getServerSoundState=():SoundState=>"idle";
export function subscribeSound(listener:()=>void) { listeners.add(listener); return ()=>{listeners.delete(listener);}; }
function status(next:SoundState) { if(state!==next) {state=next;listeners.forEach(fn=>fn());} }
let active:AbortController | undefined;
let lastPlayback:Playback | undefined;
let player:HTMLAudioElement | undefined;
let currentUtterance:SpeechSynthesisUtterance | undefined;
const synth=()=>typeof window==="undefined"?undefined:window.speechSynthesis;

function stop(clearRequest:boolean) {
  active?.abort();active=undefined;
  const ss=synth();
  if(currentUtterance || ss?.speaking || ss?.pending) ss?.cancel();
  currentUtterance=undefined;
  if(clearRequest) lastPlayback=undefined;
  if(state==="playing") status("ready");
}
export function cancelSpeech() { stop(true); }

function delay(ms:number, signal:AbortSignal):Promise<void> {
  return new Promise(resolve=>{
    if(signal.aborted) return resolve();
    const finish=()=>{clearTimeout(timer);signal.removeEventListener("abort",finish);resolve();};
    const timer=setTimeout(finish,ms);
    signal.addEventListener("abort",finish,{once:true});
  });
}

// Reuse this element: mobile WebKit grants playback permission per media element.
// play() runs synchronously, before any await, when a user taps a sound button.
function playAudio(src:string, signal:AbortSignal):Promise<ClipResult> {
  return new Promise(resolve=>{
    if(signal.aborted) return resolve("aborted");
    if(typeof Audio==="undefined") return resolve("failed");
    const audio=player??(player=new Audio());
    let settled=false;
    const finish=(result:ClipResult)=>{
      if(settled) return;settled=true;
      clearTimeout(watchdog);audio.onended=null;audio.onerror=null;audio.onplaying=null;
      signal.removeEventListener("abort",abort);audio.pause();resolve(result);
    };
    const abort=()=>finish("aborted");
    const watchdog=setTimeout(()=>finish("failed"),30000);
    signal.addEventListener("abort",abort,{once:true});
    audio.onplaying=()=>status("playing");
    audio.onended=()=>finish("complete");
    audio.onerror=()=>finish("failed");
    audio.preload="auto";audio.volume=1;audio.muted=false;audio.src=src;
    try { audio.play()?.catch((error:DOMException)=>{
      if(settled) return;finish(error?.name==="NotAllowedError"?"blocked":"failed");
    }); } catch { finish("failed"); }
  });
}

function speakText(text:string, lang:SpeechLanguage, signal:AbortSignal):Promise<boolean> {
  const ss=synth();
  if(signal.aborted) return Promise.resolve(false);
  if(!ss || typeof SpeechSynthesisUtterance==="undefined") {status("unavailable");return Promise.resolve(false);}
  if(lang==="en-GB") {
    const voice=britishVoice(ss.getVoices());
    if(voice) return speakUtterance(ss,text,lang,signal,voice);
    return waitForBritishVoice(ss,signal).then(loaded=>{
      if(signal.aborted) return false;
      if(!loaded) {status("british-unavailable");return false;}
      return speakUtterance(ss,text,lang,signal,loaded);
    });
  }
  const voice=ss.getVoices().find(v=>v.lang.replace(/_/g,"-").toLowerCase()==="ko-kr");
  return speakUtterance(ss,text,lang,signal,voice);
}

function speakUtterance(ss:SpeechSynthesis,text:string,lang:SpeechLanguage,signal:AbortSignal,voice?:SpeechSynthesisVoice):Promise<boolean> {
  return new Promise(resolve=>{
    if(signal.aborted) return resolve(false);
    const utterance=new SpeechSynthesisUtterance(text);
    currentUtterance=utterance;
    utterance.lang=lang;utterance.rate=lang==="en-GB"?.95:.9;utterance.pitch=lang==="en-GB"?1:1.05;utterance.volume=1;
    if(voice) utterance.voice=voice;
    let settled=false;
    const finish=(ok:boolean)=>{
      if(settled) return;settled=true;
      clearTimeout(startTimer);clearTimeout(endTimer);
      utterance.onstart=null;utterance.onend=null;utterance.onerror=null;
      signal.removeEventListener("abort",abort);
      if(currentUtterance===utterance) currentUtterance=undefined;
      resolve(ok);
    };
    const abort=()=>finish(false);
    const startTimer=setTimeout(()=>{status("blocked");ss.cancel();finish(false);},5000);
    const endTimer=setTimeout(()=>{status("error");ss.cancel();finish(false);},Math.max(15000,text.length*600));
    signal.addEventListener("abort",abort,{once:true});
    utterance.onstart=()=>{clearTimeout(startTimer);status("playing");};
    utterance.onend=()=>finish(true);
    utterance.onerror=event=>{status(event.error==="not-allowed"?"blocked":"unavailable");finish(false);};
    try { if(ss.paused) ss.resume();ss.speak(utterance); }
    catch {status("unavailable");finish(false);}
  });
}

async function playClip(src:string|undefined, text:string, lang:SpeechLanguage, signal:AbortSignal) {
  const paths=src?[src]:recordedSequence(text,lang);
  if(paths) {
    for(const path of paths) {
      const result=await playAudio(path,signal);
      if(result==="aborted") return false;
      if(result==="blocked") {status("blocked");return false;}
      if(result==="failed") return speakText(text,lang,signal);
    }
    return true;
  }
  return speakText(text,lang,signal);
}

async function run(play:Playback) {
  stop(false);
  const controller=new AbortController();active=controller;lastPlayback=play;
  // Delaying this call would lose the mobile tap's activation.
  const completed=await play(controller.signal);
  if(active===controller) {active=undefined;if(completed) status("ready");}
  return completed && !controller.signal.aborted;
}
export function unlockSpeech() { return run(lastPlayback??(signal=>playClip(undefined,SOUND_CHECK,"ko-KR",signal))); }
type SpeakableWord={ko:string;en:string;audioKo?:string;audioEn?:string};
export function sayKo(w:SpeakableWord) {return run(signal=>playClip(w.audioKo,w.ko,"ko-KR",signal));}
export function sayEn(w:SpeakableWord) {return run(signal=>playClip(w.audioEn,w.en,"en-GB",signal));}
export function sayBoth(w:SpeakableWord) {
  return run(async signal=>{
    if(!await playClip(w.audioKo,w.ko,"ko-KR",signal)) return false;
    await delay(250,signal);
    return !signal.aborted && playClip(w.audioEn,w.en,"en-GB",signal);
  });
}
export function saySentenceKo(text:string) {return run(signal=>playClip(undefined,text,"ko-KR",signal));}
export function playSound(src:string) {
  return run(async signal=>{
    const result=await playAudio(src,signal);
    if(result==="blocked") status("blocked");else if(result==="failed") status("error");
    return result==="complete";
  });
}
export function sayWithSound(word:SpeakableWord,src:string,lang:"ko"|"en"="ko") {
  return run(async signal=>{
    if(!await playClip(lang==="ko"?word.audioKo:word.audioEn,lang==="ko"?word.ko:word.en,lang==="ko"?"ko-KR":"en-GB",signal)) return false;
    await delay(200,signal);
    if(signal.aborted) return false;
    const result=await playAudio(src,signal);
    if(result==="blocked") status("blocked");else if(result==="failed") status("error");
    return result==="complete";
  });
}
