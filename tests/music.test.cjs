const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {createHash}=require('node:crypto');
const ts=require('typescript');
const {loader}=require('./load-ts.cjs');
const load=loader();
const root=path.resolve(__dirname,'..');
const {WORDS,CATEGORIES}=load('lib/words.ts');
const {recordedSequence}=load('lib/recorded-speech.ts');
const {SONGS,MUSIC_INSTRUMENTS,musicUrl}=load('lib/music.ts');
test('every static English lesson has a versioned, verified British recording',()=>{
  const catalog=require('../data/speech-clips.json');
  const profile=require('../public/audio/generated/british-voice.json');
  assert.equal(profile.locale,'en-GB');assert.equal(profile.voice,'Daniel');
  assert.ok(Object.keys(profile.clips).length>=320);
  for(const [key,url] of Object.entries(catalog).filter(([key])=>key.startsWith('en-GB:'))) {
    const clip=profile.clips[key];assert.ok(clip,key);assert.equal(url,'/audio/generated/'+clip.file);
    const legacy=createHash('sha256').update(key).digest('hex').slice(0,20)+'.mp3';
    assert.notEqual(clip.file,legacy,'English must not reuse stale voice URLs');
    const bytes=fs.readFileSync(path.join(root,'public',url));
    assert.equal(createHash('sha256').update(bytes).digest('hex'),clip.sha256);
    assert.equal(bytes.subarray(0,3).toString(),'ID3');
  }
  const source=ts.createSourceFile('EnglishScreen.tsx',fs.readFileSync(path.join(root,'components/EnglishScreen.tsx'),'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  let lines=0;
  function visit(node) {
    if(ts.isPropertyAssignment(node) && node.name.getText(source)==='en' && ts.isStringLiteral(node.initializer)) {
      assert.ok(catalog['en-GB:'+node.initializer.text],node.initializer.text);lines++;
    }
    ts.forEachChild(node,visit);
  }
  visit(source);assert.equal(lines,56);
});
test('all learning words and instrument names have local Korean and English recordings',()=>{
  for(const word of WORDS) for(const [lang,text] of [['ko-KR',word.ko],['en-GB',word.en]]) {
    const files=recordedSequence(text,lang);assert.ok(files?.length,word.id+' '+lang);
    for(const file of files) assert.ok(fs.statSync(path.join(root,'public',file)).size>1000,file);
  }
  assert.equal(CATEGORIES.find(c=>c.id==='instruments').ko,'악기');
  const instruments=WORDS.filter(w=>w.category==='instruments');assert.equal(instruments.length,8);
  for(const word of instruments) assert.ok(fs.statSync(path.join(root,'public',word.instrumentAudio)).size>1000);
});
test('arithmetic questions and hints can use recordings without device TTS',()=>{
  const {makeProblem,mathHint,DEFAULT_MATH}=load('lib/math.ts');
  for(const operation of ['add','subtract','multiply']) for(let i=0;i<150;i++) {
    const p=makeProblem({...DEFAULT_MATH,operation,range:100});
    const text=`${p.a} ${p.op==='+'?'더하기':p.op==='−'?'빼기':'곱하기'} ${p.b}는 얼마일까?`;
    assert.ok(recordedSequence(text,'ko-KR'),text);
    assert.ok(recordedSequence(mathHint(p),'ko-KR'),mathHint(p));
  }
});
test('every song has a complete performance for all seven melodic instruments',()=>{
  assert.equal(SONGS.length,4);assert.equal(MUSIC_INSTRUMENTS.length,7);
  for(const song of SONGS) {
    assert.ok(song.notes.split(' ').length>=24);
    assert.ok(song.notes.split(' ').every(n=>/^[CDEFGAB][45]:[\d.]+$/.test(n)));
    for(const instrument of MUSIC_INSTRUMENTS) {
      const file=path.join(root,'public',musicUrl(song.id,instrument.id));
      assert.ok(fs.statSync(file).size>10000,file);
      assert.equal(fs.readFileSync(file).subarray(0,3).toString(),'ID3');
    }
  }
});
