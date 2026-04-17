// Crops the 3 logos (ANDCOR, IVECO, MC ISO cert) out of the source xlsx composite image
// into public/logos/. Run once from a local dev environment:
//   npx tsx scripts/extract-logos.ts
//
// Source image is the embedded xl/media/image1.png inside the user's reference xlsx.
// We expect it to be copied to /tmp/xlsx_logo.png beforehand (see README → Setup).

import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const SOURCE = '/tmp/xlsx_logo.png';  // 706x214 composite
const OUT_DIR = fileURLToPath(new URL('../public/logos/', import.meta.url));

async function main() {
  if (!existsSync(SOURCE)) {
    console.error(`Missing ${SOURCE}. Extract it first:`);
    console.error(`  unzip -o "<path to>/Oferta ADV1524198.xlsx" -d /tmp/xlsx && cp /tmp/xlsx/xl/media/image1.png ${SOURCE}`);
    process.exit(1);
  }
  await mkdir(OUT_DIR, { recursive: true });

  // Crop regions chosen from the 706x214 composite:
  //   ANDCOR block  : left=10,   top=40,  w=130, h=130
  //   IVECO block   : left=170,  top=0,   w=180, h=90
  //   ISO seal      : left=175,  top=100, w=135, h=110
  // Then trim transparent edges and resize to fit a 80pt-tall logo slot.
  const targets = [
    { file: 'andcor.png', left: 15,  top: 30, width: 155, height: 170 },
    { file: 'iveco.png',  left: 175, top: 10, width: 160, height: 55  },
    { file: 'iso.png',    left: 175, top: 75, width: 115, height: 135 },
  ];

  for (const t of targets) {
    const out = path.join(OUT_DIR, t.file);
    await sharp(SOURCE)
      .extract({ left: t.left, top: t.top, width: t.width, height: t.height })
      .resize({ height: 240, fit: 'inside', withoutEnlargement: false })
      .png()
      .toFile(out);
    console.log(`✓ ${out}`);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
