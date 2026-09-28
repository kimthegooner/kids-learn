const test = require('node:test');
const assert = require('node:assert/strict');
const { loader } = require('./load-ts.cjs');
const profile = loader()('lib/profile.ts');
const environment = (store) => ({ window: { dispatchEvent() {} }, localStorage: { getItem: k => store.get(k) ?? null, setItem: (k,v) => store.set(k,v) } });

test('each browser keeps its own name across reloads without changing learning records', () => {
  const store = new Map([['kidslearn.stars', '8'], ['kidslearn.progress.v1', 'existing learning records']]);
  const env = environment(store);
  const first = loader(env)('lib/profile.ts');
  assert.equal(first.readProfile(), null);
  assert.equal(first.saveProfile({name: ' 민준 ', englishName: ' Minjun '}), true);
  const reload = loader(env)('lib/profile.ts');
  assert.equal(reload.readProfile().name, '민준');
  assert.equal(reload.readProfile().englishName, 'Minjun');
  reload.saveProfile({name: '서아', englishName: ''});
  assert.equal(first.readProfile().name, '서아');
  assert.equal(store.get('kidslearn.stars'), '8');
  assert.equal(store.get('kidslearn.progress.v1'), 'existing learning records');
  assert.equal(loader(environment(new Map()))('lib/profile.ts').readProfile(), null);
});

test('skipping setup persists a generic profile; malformed and oversized values recover safely', () => {
  const store = new Map();
  const p = loader(environment(store))('lib/profile.ts');
  p.saveProfile({name: '', englishName: 'Unused'});
  assert.equal(loader(environment(store))('lib/profile.ts').readProfile().name, '');
  assert.equal(p.readProfile().englishName, '');
  for (const raw of [null, '{bad', 'null', '{}', '{"version":1,"name":[]}', '{"version":2,"name":"old","englishName":""}']) assert.equal(profile.parseProfile(raw), null);
  assert.equal(profile.cleanName('  민\u202e준  '), '민준');
  assert.equal(profile.cleanName('가'.repeat(100)).length, 16);
  store.delete(p.PROFILE_KEY);
  assert.equal(p.readProfile(), null);
});

test('blocked and full storage retain the newly chosen name for the current session', () => {
  for (const deniedRead of [false, true]) {
    const p = loader({window: {dispatchEvent(){}}, localStorage: {
      getItem() { if (deniedRead) throw Error('denied'); return JSON.stringify({version:1,name:'이전 이름',englishName:''}); },
      setItem() { throw Error('quota'); }
    }})('lib/profile.ts');
    p.readProfile();
    assert.equal(p.saveProfile({name:'새 이름',englishName:'Sunny'}), false);
    assert.equal(p.readProfile().name, '새 이름');
    assert.equal(p.readProfile().englishName, 'Sunny');
  }
});

test('names appear naturally in greetings, English introductions and safe photo filenames', () => {
  assert.equal(profile.greeting('지우'), '지우야');
  assert.equal(profile.greeting('민준'), '민준아');
  assert.equal(profile.greeting('Sophia'), '안녕, Sophia');
  assert.equal(profile.forestTitle(''), '우리의 배움 숲');
  assert.equal(profile.introduction({name:'민준',englishName:'Minjun'}).en, 'My name is Minjun.');
  assert.equal(profile.introduction({name:'',englishName:''}).en, 'What is your name?');
  assert.equal(profile.photoTitle('서아'), '서아의 변신 사진관');
  assert.equal(profile.photoFilename('민/준', 'dinosaur'), '민준의-변신-dinosaur.png');
});
