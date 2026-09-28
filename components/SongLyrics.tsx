"use client";
import { activeLyricIndex, lyricsFor, lyricStartSeconds, type LyricLanguage } from "@/lib/song-lyrics";

type Props = {
  songId: string;
  title: string;
  position: number;
  language: LyricLanguage;
  onLanguage: (language: LyricLanguage) => void;
  onSeek: (seconds: number) => void;
  canSeek: boolean;
};
const modes: { id: LyricLanguage; label: string }[] = [
  { id: "both", label: "함께 보기" }, { id: "ko", label: "한국어" }, { id: "en", label: "English" },
];

export default function SongLyrics({ songId, title, position, language, onLanguage, onSeek, canSeek }: Props) {
  const lyrics = lyricsFor(songId);
  if (!lyrics) return null;
  const index = activeLyricIndex(songId, position);
  const line = lyrics.lines[index];
  const showKo = language !== "en", showEn = language !== "ko";
  return <section className="song-lyrics" aria-label={`${title} 가사`}>
    <div className="lyrics-heading"><h3>♪ 가사 보며 함께 불러요</h3><span>{index >= 0 ? `${index + 1} / ${lyrics.lines.length}` : "한 곡 완주!"}</span></div>
    <div className="lyrics-language" role="group" aria-label="가사 언어">{modes.map(mode =>
      <button key={mode.id} type="button" lang={mode.id === "en" ? "en-GB" : "ko"} aria-pressed={language === mode.id} onClick={() => onLanguage(mode.id)}>{mode.label}</button>
    )}</div>
    <div className="lyrics-current" aria-live="off">
      {line ? <>
        {showKo && <p className="lyrics-ko" lang="ko">{line.ko}</p>}
        {showEn && <p className="lyrics-en" lang="en-GB">{line.en}</p>}
      </> : <p className="lyrics-finish">끝까지 함께했네! 한 번 더 불러 볼까? 🌟</p>}
    </div>
    <p className="lyrics-version">{showKo && "한국어는 새로 쓴 가사예요."}{showKo && showEn && " "}{showEn && (lyrics.sources.length ? "영어는 전래 가사예요." : "영어도 새로 쓴 가사예요.")}</p>
    <details className="lyrics-sheet">
      <summary>전체 가사 펼쳐 보기</summary>
      <p>가사를 누르면 그 부분으로 이동해요.</p>
      <ol>{lyrics.lines.map((text, i) => <li key={i}>
        <button type="button" className={i === index ? "current" : ""} aria-current={i === index ? "step" : undefined} aria-label={`${i + 1}번째 가사로 이동`} disabled={!canSeek} onClick={() => onSeek(lyricStartSeconds(songId, i))}>
          <span className="lyrics-line-number" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
          <span>{showKo && <span className="lyrics-ko" lang="ko">{text.ko}</span>}{showEn && <span className="lyrics-en" lang="en-GB">{text.en}</span>}</span>
        </button>
      </li>)}</ol>
      <p className="lyrics-source">{showKo && <>한국어: {lyrics.koVersion}. </>}{showEn && <>영어: {lyrics.enVersion}. </>}{showEn && lyrics.sources.map(source => <a key={source.url} href={source.url} target="_blank" rel="noreferrer">가사 출처 ↗</a>)}</p>
    </details>
  </section>;
}
