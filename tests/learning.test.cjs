const test = require('node:test');
const assert = require('node:assert/strict');
const { loader } = require('./load-ts.cjs');
const load = loader();
const math = load('lib/math.ts');
const { parseProgress, listeningChoiceCount } = load('lib/progress.ts');
const event = (overrides = {}) => ({ id: 'event', at: Date.now(), activity: 'math', itemId: '1 + 1', label: '1 + 1', correct: true, hints: 0, level: 0, ...overrides });

test('arithmetic ranges include meaningful numbers and four distinct answers', () => {
  for (const range of math.MATH_RANGES) for (const operation of ['add','subtract']) {
    for (let i=0;i<500;i++) {
      const p=math.makeProblem({...math.DEFAULT_MATH,range,operation});
      assert.ok(p.answer>=0 && p.answer<=range);
      assert.ok(p.a<=range && p.b<=range);
      assert.equal(p.answer,operation==='add'?p.a+p.b:p.a-p.b);
      assert.ok(operation==='add'?p.answer>range/2:p.a>range/2);
      const options=math.makeOptions(p.answer,range);
      assert.equal(new Set(options).size,4);
      assert.ok(options.includes(p.answer));
      assert.ok(options.every(n=>n>=0 && n<=range));
    }
  }
});
test('multiplication respects selected tables and mixed rounds include every operation', () => {
  for (const a of [2,3,4,5,6,7,8,9]) for (let i=0;i<100;i++) {
    const p=math.makeProblem({...math.DEFAULT_MATH,operation:'multiply',tables:[a]});
    assert.equal(p.a,a); assert.equal(p.op,'×'); assert.ok(p.b>=1 && p.b<=9);
    assert.equal(p.answer,p.a*p.b);
    assert.equal(new Set(math.makeOptions(p.answer,81)).size,4);
  }
  const ops=Array.from({length:6},(_,i)=>math.makeProblem(math.DEFAULT_MATH,Math.random,i).op);
  assert.deepEqual(ops,['+','−','×','+','−','×']);
});
test('new and legacy saves start with arithmetic and validated table selections', () => {
  assert.equal(math.DEFAULT_MATH.range,20);
  assert.equal(math.DEFAULT_MATH.answerMode,'input');
  assert.equal(math.parseMathSettings({range:5,tables:[0,-2,99]}).range,20);
  assert.equal(math.parseMathSettings({tables:[]}).tables.length,4);
  assert.equal(math.parseMathSettings({tables:[2,2,7]}).tables.join(','),'2,7');
  const old=parseProgress(JSON.stringify({version:1,mathLevel:0,mathMode:'auto',events:[]}));
  assert.equal(old.mathSettings.operation,'mixed');
  assert.equal(old.mathSettings.range,20);
  assert.equal(old.mathMode,'manual');
});
test('optional automatic challenge expands arithmetic range without downgrading or using old counting records', () => {
  const correct=Array.from({length:5},()=>event({mathOperation:'+',mathRange:20}));
  assert.equal(math.recommendedMathRange(correct,20),50);
  assert.equal(math.recommendedMathRange([...correct.slice(1),event({mathOperation:'+',mathRange:20,correct:false})],20),20);
  assert.equal(math.recommendedMathRange(Array.from({length:5},()=>event()),20),20);
  assert.equal(math.recommendedMathRange(Array.from({length:5},()=>event({mathOperation:'×',mathRange:20})),20),20);
});
test('listening difficulty is independent for Korean and English, and can return to two choices', () => {
  const success = Array.from({ length: 5 }, () => event({activity:'listen',language:'ko'}));
  assert.equal(listeningChoiceCount(success, 'ko'), 4);
  assert.equal(listeningChoiceCount(success, 'en'), 2);
  assert.equal(listeningChoiceCount(success.slice(0,3), 'ko'), 3);
  assert.equal(listeningChoiceCount([...success, ...Array.from({length:6}, () => event({activity:'listen',language:'ko',correct:false}))], 'ko'), 2);
});
test('corrupt and oversized saved progress recovers without accepting invalid events', () => {
  assert.equal(parseProgress('{bad').events.length, 0);
  assert.equal(parseProgress('{"version":2}').mathLevel, 0);
  const p = parseProgress(JSON.stringify({version:1, events:[null,event({hints:-1}),event({correct:'yes'}),...Array.from({length:600},(_,i)=>event({id:String(i)}))],mathLevel:99, dailyDates:['bad','2026-09-08']}));
  assert.equal(p.events.length, 500); assert.equal(p.events[0].id, '100');
  assert.equal(p.mathLevel, 2); assert.equal(p.dailyDates.length, 1);
});
test('daily completion and explicit event IDs are idempotent and legacy stars are preserved', () => {
  const store = new Map([['kidslearn.stars','8']]);
  const p = loader({window:{dispatchEvent(){}},localStorage:{getItem:(k)=>store.get(k)??null,setItem:(k,v)=>store.set(k,v)}})('lib/progress.ts');
  assert.equal(p.readStars(),8); assert.equal(p.awardStar(),9);
  assert.equal(p.completeDaily('2026-09-08'),true); assert.equal(p.completeDaily('2026-09-08'),false);
  p.recordEvent({activity:'write',itemId:'apple',label:'사과'},'same');
  p.recordEvent({activity:'write',itemId:'apple',label:'사과'},'same');
  assert.equal(p.readProgress().events.length,2);
});
test('storage denial retains usable in-memory progress and stars', () => {
  const p = loader({window:{dispatchEvent(){}},localStorage:{getItem(){throw Error('denied')},setItem(){throw Error('denied')}}})('lib/progress.ts');
  p.recordEvent({activity:'write',itemId:'apple',label:'사과'});
  assert.equal(p.readProgress().events.length,1);
  assert.equal(p.storageAvailable(),false);
  assert.equal(p.awardStar(),1); assert.equal(p.awardStar(),2);
});
test('practice prioritizes recent difficulty and all daily syllables have finite stroke guides', () => {
  const { WORDS } = load('lib/words.ts');
  const { practiceWords, dailyWords } = load('lib/practice.ts');
  const { composeWord } = load('lib/hangul.ts');
  const difficult = WORDS[4];
  const events = [event({activity:'listen',itemId:difficult.id,language:'ko',correct:false})];
  assert.equal(practiceWords(WORDS,events,3,'2026-09-08')[0].id,difficult.id);
  assert.equal(dailyWords([], '2026-09-08').length,3);
  assert.equal(new Set(WORDS.map(w=>w.id)).size,WORDS.length);
  for (const w of WORDS) for (const ch of [...w.ko].filter(ch=>/[가-힣]/.test(ch))) {
    const guide = composeWord(ch);
    assert.ok(guide.strokes.length > 0, ch);
    assert.ok(guide.strokes.every(s=>!s.d.includes('NaN')), ch);
  }
});
test('quota failure preserves the existing star balance and subsequent session rewards', () => {
  const p = loader({window:{dispatchEvent(){}},localStorage:{getItem:()=> '8',setItem(){throw Error('quota')}}})('lib/progress.ts');
  assert.equal(p.readStars(),8);
  assert.equal(p.awardStar(),9);
  assert.equal(p.awardStar(),10);
  assert.equal(p.readStars(),10);
});

test('expanded vocabulary is categorized and quiz choices never share a word or visual', () => {
  const {WORDS,CATEGORIES}=load('lib/words.ts');
  const {distinctChoices,canPairChoices}=load('lib/practice.ts');
  assert.ok(WORDS.length>=300);
  assert.equal(CATEGORIES.length,19);
  assert.equal(WORDS.filter(w=>w.category==='footballers').length,28);
  assert.ok(WORDS.every(w=>CATEGORIES.some(c=>c.id===w.category)));
  assert.equal(WORDS.find(w=>w.id==='butterfly').category,'bugs');
  assert.equal(WORDS.find(w=>w.id==='riceball').ko,'주먹밥');
  assert.equal(WORDS.find(w=>w.id==='orange').en,'mandarin');
  for (const target of WORDS) {
    const pool=WORDS.filter(w=>w.category===target.category);
    const choices=distinctChoices(target,pool,4);
    assert.equal(choices.length,4,target.id);
    assert.ok(choices.includes(target));
    for (let i=0;i<choices.length;i++) for(let j=i+1;j<choices.length;j++) assert.ok(canPairChoices(choices[i],choices[j]));
  }
  assert.equal(canPairChoices(WORDS.find(w=>w.id==='pear'),WORDS.find(w=>w.id==='boat')),false);
  assert.equal(canPairChoices(WORDS.find(w=>w.id==='flower'),WORDS.find(w=>w.id==='rose')),false);
});
test('every player has a local portrait and source attribution', () => {
  const fs=require('node:fs');
  const path=require('node:path');
  const root=path.resolve(__dirname,'..');
  const words=JSON.parse(fs.readFileSync(path.join(root,'data/words.json'),'utf8'));
  const credits=JSON.parse(fs.readFileSync(path.join(root,'data/photo-credits.json'),'utf8'));
  const players=words.filter(w=>w.category==='footballers');
  assert.equal(players.length,28);
  for(const player of players) {
    assert.ok(player.image?.startsWith('/images/players/'),player.id);
    const credit=credits.find(c=>c.id===player.id);
    assert.ok(credit?.source.startsWith('https://commons.wikimedia.org/'),player.id);
    assert.ok(/CC BY|CC0|Public domain/i.test(credit.license),player.id);
    assert.ok(fs.statSync(path.join(root,'public',player.image)).size>1000,player.id);
  }
});
