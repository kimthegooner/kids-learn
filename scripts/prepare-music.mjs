import { mkdir, readFile, writeFile, mkdtemp, rm } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const exec=promisify(execFile);
const root=path.resolve(import.meta.dirname,"..");
const songs=JSON.parse(await readFile(path.join(root,"data/songs.json"),"utf8"));
const instruments=JSON.parse(await readFile(path.join(root,"data/music-instruments.json"),"utf8"));
const output=path.join(root,"public/audio/songs");
const temp=await mkdtemp(path.join(tmpdir(),"kids-music-"));
const rate=22050;
await mkdir(output,{recursive:true});
try {
  for(const instrument of instruments) {
    const source=`https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/${instrument.font}-mp3.js`;
    const response=await fetch(source,{signal:AbortSignal.timeout(60000)});
    if(!response.ok) throw Error(`${source}: ${response.status}`);
    const data=await response.text();
    const samples=new Map();
    const notes=[...new Set(songs.flatMap(s=>s.notes.split(" ").map(n=>n.split(":")[0])))];
    for(const note of notes) {
      const soundingNote=note[0]+(Number(note.slice(1))+instrument.octave);
      const match=data.match(new RegExp('["\']'+soundingNote+'["\']\\s*:\\s*["\']data:audio/[^;]+;base64,([^"\']+)["\']'));
      if(!match) throw Error(`Missing ${instrument.id} ${soundingNote}`);
      const mp3=path.join(temp,"note.mp3"),pcm=path.join(temp,"note.pcm");
      await writeFile(mp3,Buffer.from(match[1],"base64"));
      await exec("ffmpeg",["-nostdin","-loglevel","error","-y","-i",mp3,"-f","f32le","-ar",String(rate),"-ac","1",pcm]);
      const bytes=await readFile(pcm);
      samples.set(note,new Float32Array(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)));
    }
    for(const song of songs) {
      const score=song.notes.split(" ").map(n=>{const [pitch,beats]=n.split(":");return {pitch,seconds:Number(beats)*60/song.bpm};});
      const duration=score.reduce((sum,n)=>sum+n.seconds,0);
      const mix=new Float32Array(Math.ceil((duration+.35)*rate));
      let time=0;
      for(const [index,note] of score.entries()) {
        const sample=samples.get(note.pitch);
        const start=Math.round(time*rate);
        const length=Math.min(sample.length,Math.round(note.seconds*.96*rate));
        const fade=Math.min(Math.round(rate*.07),Math.floor(length*.15));
        const gain=index%4===0?.94:.85;
        for(let i=0;i<length;i++) {
          const envelope=Math.min(1,i/(rate*.004),(length-i)/fade);
          mix[start+i]+=sample[i]*envelope*gain;
        }
        time+=note.seconds;
      }
      const pcm=path.join(temp,"song.pcm");
      await writeFile(pcm,Buffer.from(mix.buffer));
      await exec("ffmpeg",["-nostdin","-loglevel","error","-y","-f","f32le","-ar",String(rate),"-ac","1","-i",pcm,"-af","loudnorm=I=-20:TP=-2:LRA=9","-ar","44100","-codec:a","libmp3lame","-q:a","4",path.join(output,`${song.id}-${instrument.id}.mp3`)]);
      console.log(`Rendered ${song.title} / ${instrument.name} (${Math.round(duration)}s)`);
    }
  }
  await writeFile(path.join(output,"NOTICE.txt"),"Instrumental arrangements of traditional public-domain melodies; no lyrics or existing commercial recordings are used. Performances assembled for this app from FluidR3 GM / MIDI.js Soundfonts samples (Benjamin Gleitzman and contributors), CC BY 3.0: https://github.com/gleitz/midi-js-soundfonts and https://creativecommons.org/licenses/by/3.0/ . Samples were trimmed, faded, sequenced to the melodies and normalized. Melody titles/origins and note durations are documented in data/songs.json.\n");
} finally {await rm(temp,{recursive:true,force:true});}
