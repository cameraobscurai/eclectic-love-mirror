// Mirror Easton/Dunton Music Reels from Google Drive → Supabase `videos` bucket
// under `dunton-easton/` prefix. Transcodes to web-ready H.264 (~5MB target)
// and extracts a poster JPG at 1.0s.
//
// Env required: LOVABLE_API_KEY, GOOGLE_DRIVE_API_KEY, SUPABASE_URL,
// SUPABASE_SERVICE_ROLE_KEY.

import { mkdir, writeFile, readFile, stat } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';

const FILES = [
  { id: '18yfLwH0rw4lFTeXyhyiTYvq7nvIsz2_W', slug: '01-rehearsal',   label: 'Rehearsal Reel' },
  { id: '1WzoAGL07fEqsJhMYn7OwrkrB6lBsfljQ', slug: '02-fashion',     label: 'Fashion Reel' },
  { id: '1UNTzpz6GYggmW65YL6M3kG3UA11IK6Z8', slug: '03-ceremony',    label: 'Ceremony Reel' },
  { id: '1Skeg8u-Lvos6mlKIrY10ofCx-14pt1_g', slug: '04-reception',   label: 'Reception Reel' },
  { id: '1hZaJ_2lZ-VEHZazM6TLCjsJzY5AMcd9T', slug: '05-casino-night',label: 'Casino Night Reel' },
];

const TMP = '/tmp/dunton-videos';
const BUCKET = 'videos';
const PREFIX = 'dunton-easton';

const gw = 'https://connector-gateway.lovable.dev/google_drive/drive/v3';
const lov = process.env.LOVABLE_API_KEY;
const gkey = process.env.GOOGLE_DRIVE_API_KEY;

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

function sh(cmd, args) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: ['ignore', 'inherit', 'inherit'] });
    p.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exit ${code}`))));
  });
}

async function downloadDrive(id, dest) {
  const url = `${gw}/files/${id}?alt=media`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${lov}`, 'X-Connection-Api-Key': gkey },
  });
  if (!res.ok) throw new Error(`drive ${id}: ${res.status} ${await res.text()}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(dest, buf);
  return buf.length;
}

async function uploadSb(localPath, key, contentType) {
  const body = await readFile(localPath);
  const { error } = await sb.storage.from(BUCKET).upload(key, body, {
    contentType,
    upsert: true,
    cacheControl: '31536000',
  });
  if (error) throw error;
  const { data } = sb.storage.from(BUCKET).getPublicUrl(key);
  return data.publicUrl;
}

await mkdir(TMP, { recursive: true });
const manifest = [];

for (const f of FILES) {
  const raw = `${TMP}/${f.slug}.src.mp4`;
  const web = `${TMP}/${f.slug}.mp4`;
  const poster = `${TMP}/${f.slug}.jpg`;

  console.log(`\n=== ${f.label} (${f.slug}) ===`);

  try { await stat(raw); console.log('  src cached'); }
  catch {
    console.log('  downloading from Drive…');
    const bytes = await downloadDrive(f.id, raw);
    console.log(`  ${(bytes/1e6).toFixed(1)} MB`);
  }

  console.log('  transcoding H.264 web…');
  // Portrait 1080x1920, h264 high, crf 26 ≈ 4–6MB for ~25–35s; AAC 96k.
  // -movflags +faststart for <video> streaming.
  await sh('ffmpeg', [
    '-y', '-i', raw,
    '-vf', "scale='if(gt(iw,1080),1080,iw)':-2",
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '26', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '96k', '-ac', '2',
    '-movflags', '+faststart',
    web,
  ]);

  console.log('  extracting poster…');
  await sh('ffmpeg', [
    '-y', '-ss', '1.0', '-i', web, '-frames:v', '1',
    '-vf', "scale='if(gt(iw,1080),1080,iw)':-2",
    '-q:v', '3', poster,
  ]);

  const webBytes = (await stat(web)).size;
  const posterBytes = (await stat(poster)).size;
  console.log(`  web ${(webBytes/1e6).toFixed(2)} MB · poster ${(posterBytes/1024).toFixed(0)} KB`);

  console.log('  uploading…');
  const videoUrl  = await uploadSb(web,    `${PREFIX}/${f.slug}.mp4`, 'video/mp4');
  const posterUrl = await uploadSb(poster, `${PREFIX}/${f.slug}.jpg`, 'image/jpeg');

  manifest.push({
    slug: f.slug, label: f.label, driveId: f.id,
    videoUrl, posterUrl,
    bytes: { video: webBytes, poster: posterBytes },
  });
  console.log('  ✓', videoUrl);
}

await writeFile(
  'scripts-tmp/dunton-videos-manifest.json',
  JSON.stringify({ bucket: BUCKET, prefix: PREFIX, items: manifest }, null, 2),
);
console.log('\nWrote scripts-tmp/dunton-videos-manifest.json');
