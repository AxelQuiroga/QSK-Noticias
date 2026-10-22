const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const PUBLIC_DIR = path.resolve('public');
const SOURCE_DIR = path.join(PUBLIC_DIR, 'images', 'noticias');
const OUT_DIR = path.join(PUBLIC_DIR, 'images', 'noticias', 'optimized');

// Anchos de variante elegidos a partir de las medidas reales de renderizado:
// - Tarjeta por defecto (mobile ~378px, 2 columnas en md+ ~50vw): 400/600/800 cubren 1x y retina.
// - Tarjeta destacada (mobile 100vw, lg+ ~52vw): 800/1200 cubren desktop.
const WIDTHS = [400, 600, 800, 1200];
const QUALITY = 82;

fs.mkdirSync(OUT_DIR, { recursive: true });

let totalOriginal = 0;
let totalOptimized = 0;
let count = 0;

(async () => {
  const files = fs
    .readdirSync(SOURCE_DIR)
    .filter((f) => /\.(jpe?g|png|webp|heif|heic|jfif|avif)$/i.test(f))
    .sort();

  for (const file of files) {
    const sourcePath = path.join(SOURCE_DIR, file);
    const stat = fs.statSync(sourcePath);
    totalOriginal += stat.size;

    const metadata = await sharp(sourcePath).metadata();
    const { width: srcW = 0, height: srcH = 0, format: srcFormat } = metadata;
    const aspectRatio = srcW && srcH ? srcW / srcH : null;
    if (!aspectRatio) continue;

    const variants = [];
    for (const targetW of WIDTHS) {
      if (targetW >= srcW) continue; // sin upscale
      const targetH = Math.round(targetW / aspectRatio);
      const outName = `${path.parse(file).name}-w${targetW}.webp`;
      const outPath = path.join(OUT_DIR, outName);
      await sharp(sourcePath)
        .resize(targetW, targetH, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: QUALITY, effort: 6 })
        .toFile(outPath);
      const outStat = fs.statSync(outPath);
      totalOptimized += outStat.size;
      variants.push({ width: targetW, height: targetH, file: outName, size: outStat.size });
      count++;
    }

    console.log(
      `${file} ${srcW}x${srcH} ${srcFormat} ${(stat.size / 1024).toFixed(0)}KiB -> ${variants.length} variantes`,
    );
  }

  console.log(`\nTotal archivos origen: ${files.length}`);
  console.log(`Total variantes generadas: ${count}`);
  console.log(`Tamaño original (referencia): ${(totalOriginal / 1024).toFixed(0)} KiB`);
  console.log(`Tamaño variantes WebP: ${(totalOptimized / 1024).toFixed(0)} KiB`);
})();
