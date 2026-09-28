import songs from "@/data/songs.json";
import instruments from "@/data/music-instruments.json";
import { BASE } from "./config";
export const SONGS=songs;
export const MUSIC_INSTRUMENTS=instruments;
export function musicUrl(songId:string,instrumentId:string) { return `${BASE}/audio/songs/${songId}-${instrumentId}.mp3`; }
export function songSeconds(song:typeof songs[number]) {return Math.round(song.notes.split(" ").reduce((sum,n)=>sum+Number(n.split(":")[1]),0)*60/song.bpm);}
