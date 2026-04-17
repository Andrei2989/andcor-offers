// Renders the seed offer to a PDF file for visual comparison against the reference.
// Usage: npx tsx scripts/render-pdf.tsx [output_path]
import { createElement } from 'react';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { renderToBuffer, Font } from '@react-pdf/renderer';
import { OfferDocument } from '../src/pdf/OfferDocument';
import { SEED_OFFER } from '../src/pdf/seedOffer';

const root = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(root, '..');

// Register fonts from local disk (node can't fetch /fonts/... like the browser can)
Font.register({
  family: 'Inter',
  fonts: [
    { src: path.join(projectRoot, 'public/fonts/Inter-Regular.ttf'), fontWeight: 400 },
    { src: path.join(projectRoot, 'public/fonts/Inter-Medium.ttf'), fontWeight: 500 },
    { src: path.join(projectRoot, 'public/fonts/Inter-SemiBold.ttf'), fontWeight: 600 },
    { src: path.join(projectRoot, 'public/fonts/Inter-Bold.ttf'), fontWeight: 700 },
  ],
});
Font.registerHyphenationCallback((w) => [w]);

async function loadLogoAsDataUrl(rel: string): Promise<string> {
  const bytes = await readFile(path.join(projectRoot, 'public', rel));
  return `data:image/png;base64,${bytes.toString('base64')}`;
}

async function main() {
  const outPath = process.argv[2] ?? path.join(projectRoot, 'generated.pdf');

  // Swap the logo URLs (which are browser-relative) for data URLs so react-pdf can load them in node.
  const offer = {
    ...SEED_OFFER,
    company: {
      ...SEED_OFFER.company,
      logo_url: await loadLogoAsDataUrl('logos/andcor.png'),
      iveco_logo_url: await loadLogoAsDataUrl('logos/iveco.png'),
      iso_logo_url: await loadLogoAsDataUrl('logos/iso.png'),
    },
  };

  const element = createElement(OfferDocument, { offer });
  const buf = await renderToBuffer(element as any);
  await writeFile(outPath, buf);
  console.log(`✓ ${outPath} (${buf.length} bytes)`);
}

main().catch((e) => { console.error(e); process.exit(1); });
