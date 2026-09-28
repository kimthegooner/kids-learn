"use client";
import { useEffect, useRef, useState } from "react";
import { MUSIC_INSTRUMENTS, SONGS, musicUrl, songSeconds } from "@/lib/music";
import { EnsemblePlayer, INITIAL_ENSEMBLE } from "@/lib/ensemble-player";
import { cancelSpeech } from "@/lib/speech";
import SongLyrics from "./SongLyrics";
import { type LyricLanguage } from "@/lib/song-lyrics";

const clock = (seconds:number) => `${Math.floor(seconds/60)}:${String(Math.floor(seconds%60)).padStart(2,"0")}`;
const DEFAULT_VOLUMES = Object.fromEntries(MUSIC_INSTRUMENTS.map(i=>[i.id,.8]));

export default function MusicScreen() {
  const [songId,setSongId]=useState(SONGS[0].id);
  const [instrumentIds,setInstrumentIds]=useState<string[]>([MUSIC_INSTRUMENTS[0].id]);
  const [volumes,setVolumes]=useState<Record<string,number>>(DEFAULT_VOLUMES);
  const [repeat,setRepeat]=useState(false);
  const [lyricLanguage,setLyricLanguage]=useState<LyricLanguage>("both");
  const [playback,setPlayback]=useState(INITIAL_ENSEMBLE);
  const player=useRef<EnsemblePlayer|null>(null);
  const song=SONGS.find(s=>s.id===songId)!;
  const selected=MUSIC_INSTRUMENTS.filter(i=>instrumentIds.includes(i.id));
  const playing=playback.status==="playing";
  const loading=playback.status==="loading";
  const ensemble=selected.length>1;

  useEffect(()=>{
    cancelSpeech();
    const engine=new EnsemblePlayer(setPlayback);
    player.current=engine;
    const hide=()=>{if(document.hidden) engine.pause();};
    document.addEventListener("visibilitychange",hide);
    return ()=>{document.removeEventListener("visibilitychange",hide);engine.dispose();player.current=null;};
  },[]);
  useEffect(()=>{
    player.current?.configure(instrumentIds.map(id=>({id,url:musicUrl(songId,id)})),songSeconds(song)+.35);
  },[songId,instrumentIds]);
  useEffect(()=>{player.current?.setVolumes(volumes);},[volumes]);
  useEffect(()=>{player.current?.setRepeat(repeat);},[repeat]);

  const toggle=(id:string)=>setInstrumentIds(ids=>ids.includes(id)?ids.filter(value=>value!==id):[...ids,id]);
  const play=()=>{
    if(playing||loading) {player.current?.pause();return;}
    cancelSpeech();void player.current?.play();
  };
  const status=playback.error || (!selected.length?"함께 연주할 악기를 한 가지 이상 골라 주세요.":loading?"선택한 악기들이 모두 준비되면 함께 시작해요.":playing?`${playback.activeTracks}개 악기가 ${ensemble?"함께 ":""}연주하고 있어요.`:playback.status==="ended"?"멋진 연주였어! 한 번 더 들어 볼까?":playback.status==="paused"?"잠깐 쉬는 중이에요. 같은 자리에서 이어 들어요.":"준비됐다면 재생 버튼을 눌러 봐.");
  return <div className="screen music-screen">
    <div className="page-heading"><span className="eyebrow">우리 집 작은 음악회</span><h1 className="title">다양한 악기로 음악 듣기</h1><p className="subtitle">혼자 연주해도, 다 함께 연주해도 좋아.<br className="mobile-break" /> 좋아하는 악기를 골라 나만의 오케스트라를 만들어 봐!</p></div>
    <div className="music-layout">
      <section className="music-choices" aria-label="동요와 악기 선택">
        <div className="music-step"><span>01</span><div><h2>어떤 동요를 들을까?</h2><p>익숙한 멜로디를 골라요.</p></div></div>
        <div className="music-song-grid">{SONGS.map(s=><button key={s.id} className={`music-song${s.id===songId?" selected":""}`} aria-pressed={s.id===songId} onClick={()=>{if(s.id!==songId){player.current?.restart();setSongId(s.id);}}}><span aria-hidden="true">{s.emoji}</span><strong>{s.title}</strong><small>{s.description}</small><em>{songSeconds(s)}초</em></button>)}</div>
        <div className="music-step"><span>02</span><div><h2>누가 함께 연주할까?</h2><p>악기를 여러 개 고르면 같은 박자로 합주해요.</p></div></div>
        <div className="music-selection-tools"><span>{selected.length} / 7개 선택</span><div><button onClick={()=>setInstrumentIds(MUSIC_INSTRUMENTS.map(i=>i.id))}>모두 함께</button><button onClick={()=>setInstrumentIds(["piano"])}>피아노만</button></div></div>
        <div className="music-instrument-grid">{MUSIC_INSTRUMENTS.map(i=><button key={i.id} className={instrumentIds.includes(i.id)?"selected":""} aria-pressed={instrumentIds.includes(i.id)} aria-label={`${i.name} 선택`} onClick={()=>toggle(i.id)}><span aria-hidden="true">{i.emoji}</span><strong>{i.name}</strong><small aria-hidden="true">{instrumentIds.includes(i.id)?"✓ 함께 연주":"＋ 추가하기"}</small></button>)}</div>
        <p className="music-selection-hint">동요나 악기를 바꾸면 처음부터 준비해요.<br/>연주 중에도 아래 음량으로 악기들의 소리를 섞어 볼 수 있어요.</p>
      </section>
      <section className={`music-player${playing?" is-playing":""}`} aria-label="동요 연주" aria-busy={loading}>
        <span className="eyebrow">{playing?(ensemble?"우리들의 작은 오케스트라":"지금 연주 중이에요"):"오늘의 연주를 준비했어요"}</span>
        <div className="music-record" aria-hidden="true"><i>♪</i><i>♫</i><span>{ensemble?"🎶":selected[0]?.emoji??"♪"}</span></div>
        <div className="music-ensemble-members" aria-label="선택한 연주 악기">{selected.map(i=><span key={i.id}>{i.emoji} {i.name}</span>)}</div>
        <span className="music-player-instrument">{ensemble?`${selected.length}개 악기가 함께하는 합주`:selected.length?`${selected[0].name}의 선율로`:"나만의 연주자를 골라요"}</span><h2>{song.title}</h2>
        <p className="music-player-status" role="status">{status}</p>
        <button className="music-play" disabled={!selected.length} onClick={play} aria-label={loading?"연주 준비 취소":playing?"연주 일시정지":"동요 연주 듣기"}><span aria-hidden="true">{loading?"…":playing?"Ⅱ":"▶"}</span>{loading?"준비 중 · 취소":playing?"잠깐 쉬기":ensemble?"함께 연주 듣기":"연주 듣기"}</button>
        <div className="music-timeline"><input type="range" min="0" max={playback.duration||1} step="0.1" value={playback.position} disabled={loading||!selected.length} onChange={e=>player.current?.seek(Number(e.target.value))} aria-label="연주 위치" aria-valuetext={`${clock(playback.position)} / ${clock(playback.duration)}`}/><div><span>{clock(playback.position)}</span><span>{clock(playback.duration)}</span></div></div>
        <div className="music-player-options"><button onClick={()=>player.current?.restart()}>↺ 처음부터</button><label><input type="checkbox" checked={repeat} onChange={e=>setRepeat(e.target.checked)}/> 반복해서 듣기</label></div>
        <SongLyrics key={songId} songId={songId} title={song.title} position={playback.position} language={lyricLanguage} onLanguage={setLyricLanguage} canSeek={!loading&&selected.length>0} onSeek={seconds=>player.current?.seek(seconds)}/>
        {selected.length>0 && <details className="music-mixer" open={ensemble}><summary>🎚️ 악기별 음량 조절</summary><div>{selected.map(i=><label key={i.id}><span>{i.emoji} {i.name}</span><input type="range" min="0" max="100" step="5" value={Math.round(volumes[i.id]*100)} onChange={e=>setVolumes(v=>({...v,[i.id]:Number(e.target.value)/100}))} aria-label={`${i.name} 음량`}/><output>{Math.round(volumes[i.id]*100)}%</output></label>)}</div></details>}
        <p className="music-listening-tip">피아노와 바이올린은 어떤 소리일까?<br />플루트도 초대해서 소리가 어우러지는 걸 들어 봐.</p>
      </section>
    </div>
    <p className="instrument-credit">전래 동요의 멜로디를 악기 음색으로 연주했어요. · <a href="https://github.com/gleitz/midi-js-soundfonts" target="_blank" rel="noreferrer">음색 출처: FluidR3 / MIDI.js Soundfonts</a> · <a href="https://creativecommons.org/licenses/by/3.0/" target="_blank" rel="noreferrer">CC BY 3.0</a></p>
  </div>;
}
