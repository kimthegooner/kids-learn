"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import { cleanName, EMPTY_PROFILE, forestTitle, NAME_LIMIT, type ChildProfile } from "@/lib/profile";
import { SproutMark } from "./ForestScene";

type Props = { profile: ChildProfile; onSave: (profile: ChildProfile) => boolean; welcome?: boolean };

export default function ProfileForm({ profile, onSave, welcome = false }: Props) {
  const [name, setName] = useState(profile.name);
  const [englishName, setEnglishName] = useState(profile.englishName);
  const [message, setMessage] = useState("");
  const id = useId();
  useEffect(() => { setName(profile.name); setEnglishName(profile.englishName); }, [profile.name, profile.englishName]);
  function submit(event: FormEvent) {
    event.preventDefault();
    const saved = onSave({ name, englishName });
    setMessage(saved ? "이름을 저장했어요. 화면에 바로 반영됩니다." : "이름을 적용했어요. 기기 저장이 차단되어 이번 실행 중에만 유지돼요.");
  }
  return <form className="profile-form" onSubmit={submit}>
    <div className="profile-preview" aria-live="polite"><SproutMark /><span>{forestTitle(cleanName(name))}<small>작은 호기심이 자라는 곳</small></span></div>
    <div className="profile-field"><label htmlFor={`${id}-name`}>아이 이름 또는 별명</label><input id={`${id}-name`} value={name} onChange={(e) => { setName(e.target.value); setMessage(""); }} maxLength={NAME_LIMIT} placeholder="예: 민준, 서아" autoComplete="off" aria-describedby={`${id}-hint`} /><small id={`${id}-hint`}>부르고 싶은 이름으로 적어 주세요. 최대 {NAME_LIMIT}자까지 쓸 수 있어요.</small></div>
    <details className="profile-english"><summary>영어 이름도 넣을까요? <span>선택</span></summary><div className="profile-field"><label htmlFor={`${id}-english`}>영어 이름</label><input id={`${id}-english`} value={englishName} onChange={(e) => { setEnglishName(e.target.value); setMessage(""); }} maxLength={30} placeholder="예: Minjun, Sophia" autoComplete="off" /><small>생활 영어 자기소개에서 사용해요. 비워 두면 위의 이름을 사용합니다.</small></div></details>
    <div className="profile-actions"><button className="hero-start" type="submit">{welcome ? "우리 아이의 숲 시작하기" : "이름 저장"}<span aria-hidden="true">→</span></button>{welcome && <button className="text-link" type="button" onClick={() => onSave(EMPTY_PROFILE)}>이름 없이 둘러보기</button>}</div>
    {!welcome && <p className="profile-help">이름을 비워 저장하면 “우리의 배움 숲”으로 표시해요. 이름을 바꿔도 별과 학습 기록은 그대로 유지돼요.</p>}
    <p className="profile-help">이름은 이 브라우저에만 저장돼요. 다른 기기에서는 다시 설정해 주세요.</p>
    <p className="profile-result" role="status">{message}</p>
  </form>;
}

export function ProfileWelcome({ onSave }: { onSave: Props["onSave"] }) {
  return <div className="screen welcome-screen"><section className="welcome-card"><span className="eyebrow">반가워요, 작은 탐험가</span><h1>누구의 숲으로<br />꾸며 볼까요?</h1><p className="welcome-intro">이름을 알려 주면 우리 아이만의 배움 숲이 돼요.<br />나중에 <strong>부모님 → 아이 이름</strong>에서 바꿀 수 있어요.</p><ProfileForm profile={EMPTY_PROFILE} onSave={onSave} welcome /></section></div>;
}
