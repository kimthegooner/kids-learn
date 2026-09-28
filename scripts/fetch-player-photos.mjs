// Download only portraits with a Commons license record. Existing local photos
// stay intact; attribution is saved beside the content for the parent screen.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
const root = new URL('../', import.meta.url).pathname;
const wordsPath = join(root, 'data/words.json');
const words = JSON.parse(await readFile(wordsPath, 'utf8'));
const players = words.filter(w => w.category === 'footballers');
const creditsPath = join(root, 'data/photo-credits.json');
let credits = [];
try { credits = JSON.parse(await readFile(creditsPath, 'utf8')); } catch {}
const headers = { 'User-Agent': 'KidsLearnEducationalApp/1.0 (local vocabulary picture book)' };
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function get(url) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(18000) });
    if (res.status === 429) {
      const retry = res.headers.get('retry-after');
      const seconds = retry && /^\d+$/.test(retry) ? Number(retry) : retry ? Math.max(1, (Date.parse(retry) - Date.now())/1000) : 60 * (attempt + 1);
      console.log(`Rate limit at ${new URL(url).hostname}; waiting ${Math.ceil(seconds)} seconds.`);
      await pause(Math.max(1000, seconds * 1000));
      continue;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status} at ${new URL(url).hostname}`);
    return res;
  }
  throw new Error('Rate limit persists; retry later');
}
const plain = text => String(text ?? '').replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').trim();
await mkdir(join(root, 'public/images/players'), { recursive: true });
let done = 0;
for (const player of players) {
  if (credits.some(c => c.id === player.id)) { done++; continue; }
  try {
    const summary = await (await get(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(player.wiki)}`)).json();
    const original = summary.originalimage?.source;
    if (!original || !original.includes('upload.wikimedia.org/wikipedia/commons/')) throw new Error('No Commons portrait');
    const filename = decodeURIComponent(new URL(original).pathname.split('/').pop());
    const api = new URL('https://commons.wikimedia.org/w/api.php');
    api.search = new URLSearchParams({ action:'query',format:'json',prop:'imageinfo',iiprop:'url|extmetadata',iiurlwidth:'480',titles:`File:${filename}` });
    const json = await (await get(api)).json();
    const info = Object.values(json.query?.pages ?? {})[0]?.imageinfo?.[0];
    const license = plain(info?.extmetadata?.LicenseShortName?.value);
    if (!info || !/CC BY|CC0|Public domain/i.test(license)) throw new Error(`Unsupported license: ${license}`);
    const src = info.thumburl ?? info.url;
    const res = await get(src);
    const mime = res.headers.get('content-type') ?? '';
    const ext = mime.includes('png') ? 'png' : mime.includes('jpeg') ? 'jpg' : mime.includes('webp') ? 'webp' : null;
    if (!ext) throw new Error(`Unsupported image: ${mime}`);
    const relative = `/images/players/${player.id}.${ext}`;
    await writeFile(join(root, 'public', relative), Buffer.from(await res.arrayBuffer()));
    player.image = relative;
    credits.push({ id:player.id, label:player.ko, author:plain(info.extmetadata?.Artist?.value), license, licenseUrl:info.extmetadata?.LicenseUrl?.value ?? '', source:info.descriptionurl, image:relative });
    await writeFile(creditsPath, JSON.stringify(credits,null,2)+'\n');
    await writeFile(wordsPath, '[\n'+words.map(w=>'  '+JSON.stringify(w)).join(',\n')+'\n]\n');
    done++;
    console.log(`${player.ko}: ${license}`);
    await pause(4000);
  } catch (error) { console.log(`${player.ko}: ${error.message}`); if (error.message.includes("Rate limit")) break; }
}
console.log(`Licensed portraits: ${done}/${players.length}`);
