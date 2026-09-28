import { mkdir, readFile, writeFile, mkdtemp, rm } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const exec=promisify(execFile);
const root=path.resolve(import.meta.dirname,"..");
const output=path.join(root,"public/audio/instruments");
const temp=await mkdtemp(path.join(tmpdir(),"kids-instruments-"));
const instruments={drum:"taiko_drum",guitar:"acoustic_guitar_nylon",piano:"acoustic_grand_piano",trumpet:"trumpet",violin:"violin",flute:"flute",saxophone:"alto_sax",xylophone:"xylophone"};
await mkdir(output,{recursive:true});
const credits=[];
try {
  for(const [id,font] of Object.entries(instruments)) {
    const source=`https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/${font}-mp3.js`;
    const r=await fetch(source,{signal:AbortSignal.timeout(60000)});
    if(!r.ok) throw Error(`${source}: ${r.status}`);
    const data=await r.text();
    const notes=id==="drum"?["C3","C3","C3","C3"]:id==="flute"?["C5","E5","G5","C6"]:["C4","E4","G4","C5"];
    const inputs=[];
    for(let i=0;i<notes.length;i++) {
      // Extract data strings only; never execute downloaded JavaScript.
      const match=data.match(new RegExp('["\']'+notes[i]+'["\']\\s*:\\s*["\']data:audio/[^;]+;base64,([^"\']+)["\']'));
      if(!match) throw Error(`Missing note ${font} ${notes[i]}`);
      const filename=path.join(temp,`${id}-${i}.mp3`);
      await writeFile(filename,Buffer.from(match[1],"base64"));
      inputs.push("-i",filename);
    }
    const filters=notes.map((_,i)=>`[${i}:a]atrim=0:${i===3?1.2:.55},asetpts=PTS-STARTPTS,afade=t=out:st=${i===3?.85:.42}:d=${i===3?.35:.13}[a${i}]`).join(";")+";[a0][a1][a2][a3]concat=n=4:v=0:a=1,loudnorm=I=-20:TP=-2:LRA=9[out]";
    await exec("ffmpeg",["-nostdin","-loglevel","error","-y",...inputs,"-filter_complex",filters,"-map","[out]","-ar","44100","-ac","1","-codec:a","libmp3lame","-q:a","4",path.join(output,id+".mp3")]);
    credits.push({id,file:`/audio/instruments/${id}.mp3`,source,collection:"FluidR3 GM soundfont / MIDI.js Soundfonts",renderedBy:"Benjamin Gleitzman and MIDI.js Soundfonts contributors",license:"CC BY 3.0",licenseUrl:"https://creativecommons.org/licenses/by/3.0/",changes:"Four notes trimmed, faded, concatenated and volume-normalized; MP3 encoded."});
    console.log(`Prepared ${id}`);
  }
  await writeFile(path.join(output,"credits.json"),JSON.stringify(credits,null,2)+"\n");
} finally {await rm(temp,{recursive:true,force:true});}
