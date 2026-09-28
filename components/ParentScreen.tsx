"use client";

import PhotoCredits from "./PhotoCredits";
import ProfileForm from "./ProfileForm";
import type { ChildProfile } from "@/lib/profile";
import { useEffect, useState } from "react";
import { MATH_OPERATIONS, MATH_RANGES, type MathSettings } from "@/lib/math";
import { type Progress, localDay, readProgress, saveProgress, storageAvailable } from "@/lib/progress";

const NAMES = { learn: "듣기", listen: "그림 찾기", connect: "잇기", write: "따라쓰기", stroke: "획순쓰기", math: "수학", daily: "오늘의 놀이" };
export default function ParentScreen({ profile, onProfileSave }: { profile: ChildProfile; onProfileSave: (profile: ChildProfile) => boolean }) {
  const [progress, setProgress] = useState<Progress | null>(null);
  useEffect(() => {
    const sync = () => setProgress(readProgress());
    sync();
    window.addEventListener("kidslearn-progress", sync);
    window.addEventListener("storage", sync);
    return () => { window.removeEventListener("kidslearn-progress", sync); window.removeEventListener("storage", sync); };
  }, []);
  if (!progress) return <div className="screen">기록을 불러와요…</div>;
  const today = progress.events.filter((e) => localDay(e.at) === localDay());
  const recent = progress.events.filter((e) => e.at >= Date.now() - 7 * 86400000);
  const quizzes = recent.filter((e) => e.correct !== undefined);
  const needsHelp = [...new Map(recent.filter((e) => e.correct !== undefined).map((e) => [`${e.activity}:${e.language}:${e.itemId}`, e])).values()]
    .filter((e) => e.correct === false || (e.hints ?? 0) > 0).sort((a, b) => b.at - a.at).slice(0, 8);
  function updateMath(settings: MathSettings, mode = progress!.mathMode) {
    const next = { ...readProgress(), mathSettings: settings, mathMode: mode };
    saveProgress(next);
    setProgress(next);
  }
  return <div className="screen parent-screen">
    <div className="parent-heading"><h1 className="title">부모님 학습 기록</h1><p>함께 해 본 활동과 도움이 필요했던 내용을 살펴보세요.</p></div>
    <section className="parent-card"><h2>아이 이름</h2><p>홈 인사, 생활 영어 자기소개, 변신 사진에 사용할 이름이에요.</p><ProfileForm profile={profile} onSave={onProfileSave} /></section>
    {!storageAvailable() && <p role="status" className="storage-notice">기기 저장을 사용할 수 없어 이번 실행 중에만 기록이 유지됩니다.</p>}
    <div className="stat-grid">
      <div><strong>{today.filter((e) => e.activity !== "daily").length}</strong><span>오늘 완료한 활동</span></div>
      <div><strong>{progress.dailyDates.filter((d) => d >= localDay(Date.now() - 6 * 86400000)).length}일</strong><span>최근 7일 오늘의 놀이</span></div>
      <div><strong>{quizzes.length ? `${Math.round(quizzes.filter((e) => e.correct && !e.hints).length / quizzes.length * 100)}%` : "—"}</strong><span>최근 7일 도움 없이 첫 정답</span></div>
    </div>
    <section className="parent-card">
      <h2>수학 연습 설정</h2><p>덧셈·뺄셈·곱셈과 수 범위를 선택할 수 있습니다. 자동 도전은 덧셈·뺄셈 5문제를 도움 없이 연속으로 맞히면 다음 수 범위로 넓혀 줍니다.</p>
      <label className="setting-label">연산<select value={progress.mathSettings.operation} onChange={(e) => updateMath({ ...progress.mathSettings, operation: e.target.value as MathSettings["operation"] })}>{MATH_OPERATIONS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}</select></label>
      <label className="setting-label">덧셈·뺄셈 범위<select value={progress.mathSettings.range} onChange={(e) => updateMath({ ...progress.mathSettings, range: Number(e.target.value) as MathSettings["range"] })}>{MATH_RANGES.map((range) => <option key={range} value={range}>{range} 이내</option>)}</select></label>
      <label className="setting-label">진행 방식<select value={progress.mathMode} onChange={(e) => updateMath(progress.mathSettings, e.target.value as "auto" | "manual")}><option value="manual">선택한 범위 유지</option><option value="auto">연속 정답이면 더 큰 수에 도전</option></select></label>
      <p>구구단과 답 입력 방식, 문제 수는 수학 시작 화면에서 고를 수 있습니다.</p>
    </section>
    <section className="parent-card"><h2>다시 함께 해 볼 내용</h2><p>최근 7일 동안 마지막 시도에 오답이나 힌트가 있었던 내용입니다. 글씨의 정확도는 채점하지 않습니다.</p>
      {needsHelp.length ? <ul className="review-list">{needsHelp.map((e) => <li key={e.id}><strong>{e.label}</strong><span>{NAMES[e.activity]}{e.language === "en" ? " · 영어" : ""} · {e.correct === false ? "다시 시도했어요" : "힌트를 썼어요"}</span></li>)}</ul> : <p className="empty-note">아직 복습할 기록이 없어요. 놀이를 마치면 이곳에 기록이 쌓입니다.</p>}
    </section>
    <section className="parent-card"><h2>최근 활동</h2>{progress.events.length ? <ul className="review-list">{progress.events.slice(-12).reverse().map((e) => <li key={e.id}><strong>{e.label}</strong><span>{NAMES[e.activity]}{e.language === "en" ? " · 영어" : ""} · {new Date(e.at).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })}</span></li>)}</ul> : <p className="empty-note">첫 놀이를 시작해 보세요.</p>}</section>
    <PhotoCredits />
    <p className="storage-note">기록은 이 브라우저에만 저장됩니다. 다른 기기와 공유되지 않으며, 브라우저 데이터를 지우면 사라집니다. 최근 활동 500개를 보관합니다.</p>
  </div>;
}
