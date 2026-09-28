const test=require('node:test');
const assert=require('node:assert/strict');
const {loader}=require('./load-ts.cjs');
const load=loader();
const {SONGS}=load('lib/music.ts');
const {lyricsFor,activeLyricIndex,lyricStartSeconds}=load('lib/song-lyrics.ts');

test('each of the four performances has complete Korean and English lyrics aligned to score phrases',()=>{
  assert.equal(SONGS.length,4);
  for(const song of SONGS) {
    const data=lyricsFor(song.id);assert.ok(data,song.id);assert.ok(data.lines.length>=5);
    const noteBoundaries=[0];for(const n of song.notes.split(' '))noteBoundaries.push(noteBoundaries.at(-1)+Number(n.split(':')[1]));
    let end=0;
    for(const line of data.lines) {
      assert.equal(line.startBeat,end,song.id+' gaps/overlaps');assert.ok(line.endBeat>line.startBeat);
      assert.ok(noteBoundaries.includes(line.startBeat));assert.ok(noteBoundaries.includes(line.endBeat));
      assert.match(line.ko,/[가-힣]/);assert.match(line.en,/[A-Za-z]/);end=line.endBeat;
    }
    assert.equal(end,noteBoundaries.at(-1),song.id+' reaches final note');
    assert.ok(data.koVersion.includes('새로 쓴'));assert.ok(data.enVersion);
  }
});

test('highlight changes at exact phrase boundaries, follows seeking backwards, and clears during the tail',()=>{
  for(const song of SONGS) {
    const {lines}=lyricsFor(song.id);
    lines.forEach((line,i)=>{
      const start=lyricStartSeconds(song.id,i),end=line.endBeat*60/song.bpm;
      assert.equal(activeLyricIndex(song.id,start),i,song.id+' start '+i);
      assert.equal(activeLyricIndex(song.id,(start+end)/2),i);
      assert.equal(activeLyricIndex(song.id,end-.001),i);
    });
    const final=lines.at(-1).endBeat*60/song.bpm;
    assert.equal(activeLyricIndex(song.id,final),-1);
    assert.equal(activeLyricIndex(song.id,final+.2),-1);
    assert.equal(activeLyricIndex(song.id,0),0,'repeat/restart returns to first phrase');
    assert.equal(activeLyricIndex(song.id,lyricStartSeconds(song.id,1)),1,'seek backwards');
  }
  for(const time of [-1,NaN,Infinity])assert.equal(activeLyricIndex('twinkle',time),-1);
  assert.equal(activeLyricIndex('missing',0),-1);assert.equal(lyricStartSeconds('missing',4),0);
});

test('original app adaptations are distinguished from public-domain English verses',()=>{
  for(const id of ['airplane','butterfly']) {
    assert.match(lyricsFor(id).enVersion,/새로 쓴/);assert.equal(lyricsFor(id).sources.length,0);
  }
  for(const id of ['twinkle','london']) assert.ok(lyricsFor(id).sources.every(source=>source.url.startsWith('https://')));
  assert.equal(lyricsFor('twinkle').lines[0].en,lyricsFor('twinkle').lines[4].en);
});
