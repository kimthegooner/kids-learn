import raw from "@/data/song-lyrics.json";
import { SONGS } from "./music";

export type LyricLanguage = "both" | "ko" | "en";
export type LyricLine = { startBeat: number; endBeat: number; ko: string; en: string };
export type SongLyrics = { koVersion: string; enVersion: string; sources: { label: string; url: string }[]; lines: LyricLine[] };
const lyrics: Record<string, SongLyrics> = raw;
export function lyricsFor(songId: string): SongLyrics | undefined { return lyrics[songId]; }
export function lyricStartSeconds(songId: string, index: number): number {
  const song = SONGS.find(song => song.id === songId);
  const line = lyricsFor(songId)?.lines[index];
  return song && line ? line.startBeat * 60 / song.bpm : 0;
}
export function activeLyricIndex(songId: string, seconds: number): number {
  const song = SONGS.find(song => song.id === songId);
  if (!song || !Number.isFinite(seconds) || seconds < 0) return -1;
  const beat = seconds * song.bpm / 60;
  // Tolerate floating-point roundoff at a seek/phrase boundary, without
  // stretching the lyrics into the short trailing silence in each MP3.
  return lyricsFor(songId)?.lines.findIndex(line => beat + 1e-7 >= line.startBeat && beat + 1e-7 < line.endBeat) ?? -1;
}
