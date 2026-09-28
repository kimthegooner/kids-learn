const test=require('node:test');
const assert=require('node:assert/strict');
const {loader}=require('./load-ts.cjs');
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function setup({tts=true,blocked=false,voices=[]}={}) {
  const spoken=[],clips=[],calls=[];
  const behavior={blocked};
  const events=new Map();
  const ss={speaking:false,pending:false,paused:false,getVoices:()=>voices,
    addEventListener(type,fn){events.set(type,fn);},removeEventListener(type,fn){if(events.get(type)===fn)events.delete(type);},
    cancel(){this.speaking=false;this.pending=false;},resume(){this.paused=false;},speak(u){spoken.push(u);this.speaking=true;u.onstart?.();}};
  class Audio {
    constructor(){clips.push(this);this.paused=true;}
    play(){calls.push(this.src);if(behavior.blocked)return Promise.reject({name:'NotAllowedError'});this.paused=false;this.onplaying?.();return Promise.resolve();}
    pause(){this.paused=true;}
  }
  const speech=loader({window:tts?{speechSynthesis:ss}:{},SpeechSynthesisUtterance:class {constructor(text){this.text=text;}},Audio})('lib/speech.ts');
  const end=()=>{clips[0].paused=true;clips[0].onended?.();};
  const endTts=()=>{ss.speaking=false;spoken.at(-1).onend?.();};
  return {speech,spoken,clips,calls,behavior,ss,end,endTts,events};
}
const word={ko:'사과',en:'apple'};
test('recorded Korean and English work without Web Speech and reuse one unlocked audio element',async()=>{
  const {speech,clips,calls,end}=setup({tts:false});
  const pending=speech.sayBoth(word);
  assert.equal(calls.length,1);assert.ok(calls[0].endsWith('.mp3'));
  end();await wait(270);assert.equal(clips.length,1);assert.equal(calls.length,2);assert.notEqual(calls[0],calls[1]);
  end();assert.equal(await pending,true);assert.equal(speech.getSoundState(),'ready');
});
test('navigation stops a recording and suppresses the later English or instrument sound',async()=>{
  const {speech,clips,calls}=setup();
  const pending=speech.sayWithSound(word,'/instrument.mp3');speech.cancelSpeech();
  assert.equal(await pending,false);await wait(230);assert.equal(calls.length,1);assert.equal(clips[0].paused,true);
});
test('leaving during the language gap cancels the entire sequence',async()=>{
  const {speech,calls,end}=setup();const pending=speech.sayBoth(word);end();await wait(10);speech.cancelSpeech();
  assert.equal(await pending,false);assert.equal(calls.length,1);
});
test('rapid replacement starts the latest sound inside the tap without a delayed stale clip',async()=>{
  const {speech,calls,clips,end}=setup();
  const first=speech.sayKo(word),second=speech.sayKo({ko:'토끼',en:'rabbit'}),third=speech.sayKo({ko:'고양이',en:'cat'});
  assert.equal(calls.length,3);assert.equal(clips.length,1);end();
  assert.deepEqual(await Promise.all([first,second,third]),[false,false,true]);
});
test('autoplay denial is surfaced and a direct tap retries the requested sound',async()=>{
  const {speech,behavior,calls,end}=setup({tts:false,blocked:true});
  assert.equal(await speech.sayKo(word),false);assert.equal(speech.getSoundState(),'blocked');
  behavior.blocked=false;const retry=speech.unlockSpeech();assert.equal(calls.length,2);assert.equal(calls[0],calls[1]);
  end();assert.equal(await retry,true);
});
test('missing custom recordings fall back to TTS, then complete English on the same media player',async()=>{
  const {speech,spoken,clips,end,endTts,calls}=setup();
  const pending=speech.sayBoth({...word,audioKo:'/missing.mp3'});clips[0].onerror();await wait(0);
  assert.equal(spoken[0].text,'사과');endTts();await wait(270);assert.equal(calls.length,2);end();assert.equal(await pending,true);
});
test('cancelled and unsupported dynamic speech never count as completed learning',async()=>{
  const {speech,spoken}=setup();const pending=speech.saySentenceKo('테스트 전용 새 이름 문장');assert.equal(spoken.length,1);
  speech.cancelSpeech();assert.equal(await pending,false);
  const unsupported=setup({tts:false});assert.equal(await unsupported.speech.saySentenceKo('테스트 전용 새 이름 문장'),false);assert.equal(unsupported.speech.getSoundState(),'unavailable');
});
test('instrument cards play the name before the instrument and direct instrument buttons omit the name',async()=>{
  const {speech,calls,end}=setup({tts:false});const pending=speech.sayWithSound({ko:'피아노',en:'piano'},'/piano.mp3');
  end();await wait(220);assert.equal(calls.at(-1),'/piano.mp3');end();assert.equal(await pending,true);
  const solo=speech.playSound('/violin.mp3');assert.equal(calls.at(-1),'/violin.mp3');end();assert.equal(await solo,true);
});

test('dynamic English uses a British voice even when the device default is American',async()=>{
  const us={name:'US default',lang:'en-US',default:true},uk={name:'British',lang:'en_GB'};
  const {speech,spoken,endTts}=setup({voices:[us,uk]});
  const pending=speech.sayEn({ko:'자기소개',en:'My name is Minjun.'});
  assert.equal(spoken.length,1);assert.equal(spoken[0].voice,uk);
  assert.equal(spoken[0].lang,'en-GB');assert.equal(spoken[0].pitch,1);
  endTts();assert.equal(await pending,true);
});

test('a failed English recording still falls back only to British speech',async()=>{
  const us={lang:'en-US'},uk={lang:'en-GB'};
  const {speech,spoken,clips,endTts}=setup({voices:[us,uk]});
  const pending=speech.sayEn(word);clips[0].onerror();await wait(0);
  assert.equal(spoken[0].voice,uk);endTts();assert.equal(await pending,true);
});

test('delayed British voices load before speaking and cancellation removes the waiting listener',async()=>{
  const voices=[],uk={lang:'en-GB'};
  const {speech,spoken,events,endTts}=setup({voices});
  const pending=speech.sayEn({ko:'이름',en:'My name is Seoah.'});
  assert.equal(spoken.length,0);voices.push(uk);events.get('voiceschanged')();await wait(0);
  assert.equal(spoken[0].voice,uk);assert.equal(events.size,0);endTts();assert.equal(await pending,true);
  voices.length=0;
  const cancelled=speech.sayEn({ko:'이름',en:'My name is Minjun.'});
  speech.cancelSpeech();assert.equal(await cancelled,false);assert.equal(events.size,0);
  assert.equal(spoken.length,1);
});

test('devices with only non-British English cannot silently change the accent',async()=>{
  const {speech,spoken}=setup({voices:[{lang:'en-US'},{lang:'en-AU'},{lang:'en-IE'}]});
  assert.equal(await speech.sayEn({ko:'새 이름',en:'My name is Seoah.'}),false);
  assert.equal(spoken.length,0);assert.equal(speech.getSoundState(),'british-unavailable');
});
