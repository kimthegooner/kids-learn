const test=require('node:test');
const assert=require('node:assert/strict');
const {loader}=require('./load-ts.cjs');
const flush=()=>new Promise(resolve=>setTimeout(resolve,0));
function setup({deferred=false,fail=false}={}) {
  const sources=[],gains=[],states=[],fetches=[],pending=[],contexts=[];
  const behavior={fail};
  class Param { value=0;setValueAtTime(value){this.value=value;}setTargetAtTime(value){this.value=value;} }
  class Gain {gain=new Param();connect(){}disconnect(){this.disconnected=true;}}
  class Source {connect(){}disconnect(){this.disconnected=true;}start(when,offset){this.when=when;this.offset=offset;this.started=true;}stop(){this.stopped=true;}}
  class Context {
    currentTime=5;state='suspended';destination={};
    constructor(){contexts.push(this);}
    resume(){this.resumed=true;this.state='running';return Promise.resolve();}
    close(){this.closed=true;return Promise.resolve();}
    createGain(){const node=new Gain();gains.push(node);return node;}
    createBufferSource(){const node=new Source();sources.push(node);return node;}
    decodeAudioData(){return Promise.resolve({duration:20});}
  }
  const fetch=(url,{signal})=>{fetches.push({url,signal});const response={ok:!behavior.fail,arrayBuffer:async()=>new ArrayBuffer(8)};return deferred?new Promise(resolve=>pending.push(()=>resolve(response))):Promise.resolve(response);};
  const {EnsemblePlayer}=loader({window:{AudioContext:Context},fetch,setInterval,clearInterval})('lib/ensemble-player.ts');
  const player=new EnsemblePlayer(s=>states.push(s));
  const tracks=['piano','violin','flute'].map(id=>({id,url:'/'+id+'.mp3'}));
  player.configure(tracks,20);
  return {player,tracks,sources,gains,states,fetches,pending,contexts,behavior,last:()=>states.at(-1)};
}

test('all selected parts wait for decoding, then start on the same clock and offset',async()=>{
  const q=setup({deferred:true});const play=q.player.play();
  assert.equal(q.contexts[0].resumed,true,'resume must happen synchronously inside the tap');
  await flush();assert.equal(q.fetches.length,3);assert.equal(q.sources.length,0);
  q.pending.shift()();await flush();assert.equal(q.sources.length,0);
  q.pending.splice(0).forEach(resolve=>resolve());await play;
  assert.equal(q.last().status,'playing');assert.equal(q.last().activeTracks,3);
  assert.deepEqual(q.sources.map(s=>s.when),[5.035,5.035,5.035]);
  assert.deepEqual(q.sources.map(s=>s.offset),[0,0,0]);q.player.dispose();
});

test('pause, resume and seek keep every instrument at the identical position',async()=>{
  const q=setup();await q.player.play();q.contexts[0].currentTime=10.035;q.player.pause();
  assert.ok(Math.abs(q.last().position-5)<1e-8);assert.ok(q.sources.every(s=>s.stopped));
  await q.player.play();assert.equal(q.fetches.length,3,'resume reuses decoded audio');
  assert.ok(q.sources.slice(-3).every(s=>Math.abs(s.offset-5)<1e-8));
  q.player.seek(12);assert.ok(q.sources.slice(-3).every(s=>s.offset===12));
  q.player.restart();assert.equal(q.last().position,0);assert.ok(q.sources.every(s=>s.stopped));q.player.dispose();
});

test('repeat shares the same loop boundaries and volume changes never restart parts',async()=>{
  const q=setup();q.player.setRepeat(true);await q.player.play();
  assert.ok(q.sources.every(s=>s.loop&&s.loopStart===0&&s.loopEnd===20));
  q.contexts[0].currentTime=27.035;q.player.pause();assert.ok(Math.abs(q.last().position-2)<1e-8);
  await q.player.play();q.player.setVolumes({piano:.25,violin:0,flute:1});
  assert.deepEqual(q.gains.slice(-3).map(g=>g.gain.value),[.25,0,1]);
  assert.equal(q.sources.length,6);assert.ok(q.gains[0].gain.value<=1/3);
  q.player.setRepeat(false);assert.ok(q.sources.slice(-3).every(s=>!s.loop));q.player.dispose();
});

test('changing selection, cancelling preparation or leaving cannot start stale parts later',async()=>{
  for(const action of ['configure','pause','dispose']) {
    const q=setup({deferred:true});const play=q.player.play();await flush();
    if(action==='configure')q.player.configure([q.tracks[1]],20);else q.player[action]();
    assert.ok(q.fetches.every(f=>f.signal.aborted));q.pending.forEach(resolve=>resolve());await play;
    assert.equal(q.sources.length,0,action);assert.notEqual(q.last().status,'playing');q.player.dispose();
  }
});

test('a missing part prevents a partial ensemble and the same selection can be retried',async()=>{
  const q=setup({fail:true});await q.player.play();
  assert.equal(q.last().status,'error');assert.equal(q.sources.length,0);assert.ok(q.fetches.every(f=>f.signal.aborted));
  q.behavior.fail=false;await q.player.play();assert.equal(q.last().activeTracks,3);assert.equal(q.last().status,'playing');q.player.dispose();
});

test('finishing, changing songs and disposing release every active source',async()=>{
  const q=setup();await q.player.play();q.sources[0].onended();
  assert.equal(q.last().status,'ended');assert.equal(q.last().position,20);assert.ok(q.sources.every(s=>s.stopped));
  await q.player.play();assert.equal(q.sources.at(-1).offset,0);
  q.player.configure([{id:'piano',url:'/other-song.mp3'}],30);assert.equal(q.last().position,0);assert.equal(q.last().status,'idle');
  assert.ok(q.sources.every(s=>s.stopped));await q.player.play();q.player.dispose();assert.ok(q.contexts[0].closed);assert.ok(q.sources.every(s=>s.stopped));
});

test('empty selection cannot create audio or start a performance',async()=>{
  const q=setup();q.player.configure([],20);await q.player.play();assert.equal(q.last().status,'error');assert.equal(q.contexts.length,0);q.player.dispose();
});
