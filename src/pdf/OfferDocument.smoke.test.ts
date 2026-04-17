// @vitest-environment node
// Smoke test: render the seed offer to a real PDF, parse it back, and assert
// every expected Romanian string is present. This is the main guard against
// font/diacritic regressions and section-template drift.

import { describe, it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { createElement } from 'react';
import { Font, renderToBuffer } from '@react-pdf/renderer';
// @ts-expect-error — pdf-parse ships CJS without matching TS types for this call shape
import pdfParse from 'pdf-parse';
import { OfferDocument } from './OfferDocument';
import { SEED_OFFER } from './seedOffer';

const projectRoot = path.resolve(__dirname, '..', '..');

async function setupFonts() {
  Font.register({
    family: 'Inter',
    fonts: [
      { src: path.join(projectRoot, 'public/fonts/Inter-Regular.ttf'), fontWeight: 400 },
      { src: path.join(projectRoot, 'public/fonts/Inter-Medium.ttf'), fontWeight: 500 },
      { src: path.join(projectRoot, 'public/fonts/Inter-SemiBold.ttf'), fontWeight: 600 },
      { src: path.join(projectRoot, 'public/fonts/Inter-Bold.ttf'), fontWeight: 700 },
    ],
  });
  Font.registerHyphenationCallback((w: string) => [w]);
}

async function loadLogoAsDataUrl(rel: string): Promise<string> {
  const bytes = await readFile(path.join(projectRoot, 'public', rel));
  return `data:image/png;base64,${bytes.toString('base64')}`;
}

describe('OfferDocument smoke', () => {
  it('renders seed offer with all Romanian diacritics intact', async () => {
    await setupFonts();
    const offer = {
      ...SEED_OFFER,
      company: {
        ...SEED_OFFER.company,
        logo_url: await loadLogoAsDataUrl('logos/andcor.png'),
        iveco_logo_url: await loadLogoAsDataUrl('logos/iveco.png'),
        iso_logo_url: await loadLogoAsDataUrl('logos/iso.png'),
      },
    };

    const buf = await renderToBuffer(createElement(OfferDocument, { offer }) as any);
    expect(buf.length).toBeGreaterThan(10_000);

    const parsed = await pdfParse(buf);
    const text = parsed.text;

    // Core titles
    expect(text).toContain('OFERTĂ DE PREȚ');
    expect(text).toContain('Price Quotation');
    // Metadata
    expect(text).toContain('ADV1524198');
    expect(text).toContain('17.04.2026');
    expect(text).toContain('16.06.2026');
    expect(text).toContain('NUMĂR OFERTĂ');
    expect(text).toContain('VALABILĂ PÂNĂ LA');
    expect(text).toContain('TERMEN LIVRARE');
    // Group titles (diacritic check)
    expect(text).toContain('Piese de direcție și frână');
    expect(text).toContain('Piese de frână și consumabile');
    // Product names (diacritics)
    expect(text).toContain('Bară transversală direcție');
    expect(text).toContain('Set plăcuțe frână');
    expect(text).toContain('Etanșare piston cuplare');
    expect(text).toContain('Set reparație etrier');
    expect(text).toContain('Ulei instalație frânare');
    // Totals
    expect(text).toContain('29.650');
    expect(text).toContain('93.875');
    // Terms
    expect(text).toContain('TERMENI ȘI CONDIȚII');
    expect(text).toContain('Valabilitate ofertă');
    expect(text).toContain('Garanție');
    expect(text).toContain('Înregistrat E-Factură');
    // Footer
    expect(text).toContain('Pagina 1');
  }, 20_000);
});
