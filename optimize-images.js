import sharp from 'sharp';
import { readdir } from 'fs/promises';
import { join } from 'path';

const assetsDir = './assets';
const pngFiles = (await readdir(assetsDir)).filter(f => f.endsWith('.png') && !f.includes('.txt'));

for (const file of pngFiles) {
  const input = join(assetsDir, file);
  const baseName = file.replace('.png', '');

  console.log(`Optimizing ${file}...`);

  // Create WebP version
  await sharp(input)
    .webp({ quality: 90 })
    .toFile(join(assetsDir, `${baseName}.webp`));

  // Create AVIF version (better compression)
  await sharp(input)
    .avif({ quality: 80 })
    .toFile(join(assetsDir, `${baseName}.avif`));

  console.log(`  ✓ Created ${baseName}.webp and ${baseName}.avif`);
}

console.log('\n✨ Image optimization complete!');
