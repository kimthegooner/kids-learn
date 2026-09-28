import credits from "@/data/photo-credits.json";

export function PlayerPhotoCredit({ id }: { id: string }) {
  const credit = credits.find((c) => c.id === id);
  if (!credit) return null;
  return <p className="photo-credit">사진: {credit.author} · <a href={credit.source} target="_blank" rel="noreferrer">{credit.license}</a></p>;
}

export default function PhotoCredits() {
  return <details className="parent-card photo-credits"><summary>축구선수 사진 출처 · {credits.length}장</summary>
    <ul className="review-list">{credits.map((c) => <li key={c.id}><strong>{c.label}</strong><span>{c.author} · <a href={c.source} target="_blank" rel="noreferrer">{c.license} · 원본 보기</a></span></li>)}</ul>
  </details>;
}
