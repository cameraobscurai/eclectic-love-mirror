import sharp from 'sharp';
import { readdirSync, statSync } from 'fs';
import { join } from 'path';
const dir = 'public/media/home';
const files = readdirSync(dir).filter(f => /^0[1-5]-poster\.jpg$/.test(f));
for (const f of files) {
  const src = join(dir, f);
  const base = f.replace('.jpg', '');
  // Re-encode JPG smaller too (mozjpeg-style via sharp)
  await sharp(src).jpeg({ quality: 72, mozjpeg: true }).toFile(join(dir, base + '.opt.jpg'));
  await sharp(src).webp({ quality: 70 }).toFile(join(dir, base + '.webp'));
  await sharp(src).avif({ quality: 50 }).toFile(join(dir, base + '.avif'));
}
const out = readdirSync(dir).map(f => [f, statSync(join(dir,f)).size]);
console.table(out);
