const base = process.env.SUPABASE_URL;
const man = await (await fetch(`${base}/storage/v1/object/public/squarespace-mirror/catalog/manifest.json?t=${Date.now()}`)).json();
console.log(man);
const blob = await (await fetch(`${base}/storage/v1/object/public/squarespace-mirror/${man.overlayKey}`)).json();
console.log(blob.publishedAt, blob.count);
console.log(JSON.stringify(blob.overlay['1770']).slice(0,400));
console.log('framed:', blob.overlay['1770'].cover_framed_url);
