"use client";
import { useSyncExternalStore } from "react";
import { getServerSoundState,getSoundState,subscribeSound,unlockSpeech } from "@/lib/speech";

export default function SoundControl() {
  const state=useSyncExternalStore(subscribeSound,getSoundState,getServerSoundState);
  const problem=["blocked","unavailable","british-unavailable","error"].includes(state);
  return <aside className={`sound-control${problem?" needs-sound":""}`} aria-label="소리 설정">
    <div><strong>{state==="british-unavailable"?"영국식 음성을 찾지 못했어요":problem?"소리를 다시 시작해 볼까요?":"소리와 함께 놀아요"}</strong><p role="status">{state==="playing"?"소리를 재생하고 있어요.":state==="ready"?"소리가 안 들리면 휴대폰의 미디어 음량을 확인해 주세요.":state==="british-unavailable"?"이름처럼 새로 읽는 문장에는 기기의 영어(영국) 음성이 필요해요. 준비된 단어와 생활영어는 영국식 음성으로 들을 수 있어요.":state==="unavailable"?"이 앱에서는 일부 문장을 읽지 못해요. Safari나 Chrome에서 다시 시도해 주세요.":problem?"자동 재생이 멈췄어요. 버튼을 누르면 다시 들려줘요.":"처음 한 번 눌러 소리를 시작해 주세요."}</p></div>
    <button className="soft-btn" onClick={()=>unlockSpeech()}>{problem?"🔊 다시 재생":state==="ready"||state==="playing"?"🔊 소리 확인":"🔊 소리 켜기"}</button>
  </aside>;
}
