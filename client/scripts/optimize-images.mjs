/**
 * Turns originals in client/images-src/ into web ready WebP files in three widths.
 *   npm run images --workspace client
 * Output goes to public/images/photos/<name>-<width>.webp, and the script prints the src and
 * srcSet to paste into src/config/images.ts. Originals are not published.
 */
import { mkdirSync, readdirSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const root = path.resolve(import.meta.dirname, '..');
const srcDir = path.join(root, 'images-src');
const outDir = path.join(root, 'public/images/photos');
const WIDTHS = [640, 1024, 1600];
mkdirSync(outDir, { recursive: true });

const files = readdirSync(srcDir).filter((f) => /\.(jpe?g|png|webp|avif)$/i.test(f));
if (!files.length) {
  console.log('No images found in client/images-src/. Add JPEG or PNG originals there first.');
  process.exit(0);
}
for (const file of files) {
  const name = path.parse(file).name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const image = sharp(path.join(srcDir, file)).rotate();
  const { width = 0, height = 0 } = await image.metadata();
  const set = [];
  // Smaller originals also get a copy at their own width, so they are never upscaled.
  const widths = WIDTHS.filter((w) => w <= width || w === WIDTHS[0]);
  if (width > widths[0] && !widths.includes(width) && width < WIDTHS[WIDTHS.length - 1]) widths.push(width);
  for (const w of widths) {
    const out = `${name}-${Math.min(w, width)}.webp`;
    // Metadata (including camera location) is stripped by default.
    await image.clone().resize({ width: Math.min(w, width) }).webp({ quality: 78 }).toFile(path.join(outDir, out));
    set.push(`/images/photos/${out} ${Math.min(w, width)}w`);
  }
  const middle = set[Math.min(1, set.length - 1)].split(' ')[0];
  console.log(`\n${file}  (${width} x ${height}, ratio ${(width / height).toFixed(3)})`);
  console.log(`  src: '${middle}',`);
  console.log(`  srcSet: '${set.join(', ')}',`);
}
