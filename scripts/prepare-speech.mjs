import { readFile, writeFile, mkdir, readdir, stat, mkdtemp, rm, rename } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import ts from "typescript";

// Build static speech on macOS; visitors only download ordinary MP3 files.
const exec = promisify(execFile);
const root = path.resolve(import.meta.dirname, "..");
const destination = path.join(root, "public/audio/generated");
// Include synthesis settings in English URLs so existing browser/CDN caches
// cannot serve the old recordings after a voice or pronunciation update.
const english = { locale: "en-GB", voice: "Daniel", rate: 165, revision: 2,
  filter: "loudnorm=I=-18:TP=-2:LRA=7", encoding: "libmp3lame-q2-44100" };
const { stdout: installedVoices } = await exec("say", ["-v", "?"]);
if (!installedVoices.split("\n").some(line => /^Daniel\s+en_GB\s/.test(line))) {
  throw new Error("Install the Daniel English (UK) voice before preparing learning speech.");
}
const temporary = await mkdtemp(path.join(tmpdir(), "kids-speech-"));
const clips = new Map();
const normalize = text => text.normalize("NFC").replace(/\s+/g, " ").trim();
function add(lang, text) {
  text = normalize(text);
  if (!text || !/[\p{L}\p{N}]/u.test(text)) return;
  const key = `${lang}:${text}`;
  const fingerprint = lang === "en-GB" ? JSON.stringify({ key, ...english }) : key;
  clips.set(key, {lang, text, file:createHash("sha256").update(fingerprint).digest("hex").slice(0,20)+".mp3"});
}
const words = JSON.parse(await readFile(path.join(root,"data/words.json"),"utf8"));
for (const word of words) { add("ko-KR",word.ko); add("en-GB",word.en); }
for (const char of new Set(words.flatMap(w => [...w.ko]).filter(c => /[가-힣]/.test(c)))) add("ko-KR",char);
for (const glyph of JSON.parse(await readFile(path.join(root,"data/strokes.json"),"utf8"))) add("ko-KR",glyph.sound);
for (let n=0;n<=100;n++) add("ko-KR",String(n));
for (const phrase of ["안녕! 소리가 들리면 같이 놀자.","더하기","빼기","곱하기","는 얼마일까?","초록 점에서 시작해서 써 보자."]) add("ko-KR",phrase);
const sources = ["app/page.tsx", "lib/math.ts", ... (await readdir(path.join(root,"components"))).filter(x=>x.endsWith(".tsx")).map(x=>"components/"+x)];
for (const filename of sources) {
  const source = ts.createSourceFile(filename,await readFile(path.join(root,filename),"utf8"),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  const visit = node => {
    if (ts.isCallExpression(node) && node.expression.getText(source)==="saySentenceKo" && ts.isStringLiteral(node.arguments[0])) add("ko-KR",node.arguments[0].text);
    if (filename.endsWith("EnglishScreen.tsx") && ts.isObjectLiteralExpression(node)) {
      for (const p of node.properties) if (ts.isPropertyAssignment(p) && ts.isStringLiteral(p.initializer)) {
        if (p.name.getText(source)==="ko") add("ko-KR",p.initializer.text);
        if (p.name.getText(source)==="en") add("en-GB",p.initializer.text);
      }
    }
    if (filename==="lib/math.ts" && ts.isTemplateExpression(node)) {
      add("ko-KR",node.head.text);
      for (const span of node.templateSpans) add("ko-KR",span.literal.text);
    }
    ts.forEachChild(node,visit);
  };
  visit(source);
}
await mkdir(destination,{recursive:true});
let completed=0;
try {
  const pending=[...clips.values()];
  async function worker() {
    while (pending.length) {
      const clip=pending.shift();
      const output=path.join(destination,clip.file);
      if (!await stat(output).then(s=>s.size>1000).catch(()=>false)) {
        const aiff=path.join(temporary,clip.file+".aiff");
        const isEnglish = clip.lang === "en-GB";
        await exec("say",["-v",isEnglish?english.voice:"Yuna","-r",isEnglish?String(english.rate):"155","-o",aiff,clip.text]);
        // Render atomically: an interrupted encode must never become a cached clip.
        const encoded=path.join(temporary,clip.file);
        await exec("ffmpeg",["-nostdin","-loglevel","error","-y","-i",aiff,
          ...(isEnglish?["-af",english.filter,"-ar","44100"]:[]),
          "-codec:a","libmp3lame","-q:a",isEnglish?"2":"4",encoded]);
        await rename(encoded,output);
        await rm(aiff);
      }
      completed++;
      if (completed%100===0) console.log(`Prepared ${completed}/${clips.size} speech clips`);
    }
  }
  const results=await Promise.allSettled([worker(),worker()]);
  const failed=results.find(result=>result.status==="rejected");
  if(failed) throw failed.reason;
  const manifest=Object.fromEntries([...clips].map(([key,clip])=>[key,`/audio/generated/${clip.file}`]));
  await writeFile(path.join(root,"data/speech-clips.json"),JSON.stringify(manifest,null,2)+"\n");
  const englishClips=[...clips].filter(([,clip])=>clip.lang==="en-GB");
  // Record hashes of the actual audio for deployment/content checks.
  const details={...english,clips:Object.fromEntries(await Promise.all(englishClips.map(async ([key,clip])=>
    [key,{file:clip.file,sha256:createHash("sha256").update(await readFile(path.join(destination,clip.file))).digest("hex")}])))};
  await writeFile(path.join(destination,"british-voice.json"),JSON.stringify(details,null,2)+"\n");
  await writeFile(path.join(destination,"NOTICE.txt"),`Learning speech synthesized from the app's Korean and English text. Korean: macOS Yuna, 155 words/minute. English: macOS ${english.voice}, ${english.locale}, ${english.rate} words/minute, revision ${english.revision}, loudness normalised to -18 LUFS / -2 dBTP, MP3 VBR quality 2. English URLs include the voice profile to invalidate old audio caches. No child names, recordings or personal data are included. Regenerate with node scripts/prepare-speech.mjs on macOS. Older clips are retained so previously cached pages still work.\n`);
  console.log(`Ready: ${clips.size} local speech clips`);
} finally { await rm(temporary,{recursive:true,force:true}); }
