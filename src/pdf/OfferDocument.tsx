import { Document, Page, View, StyleSheet } from '@react-pdf/renderer';
import { C, S } from './theme';
import type { PdfOffer } from './types';
import { PdfHeader } from './sections/PdfHeader';
import { PdfTitle } from './sections/PdfTitle';
import { PdfMetaBox } from './sections/PdfMetaBox';
import { PdfGroupTable } from './sections/PdfGroupTable';
import { PdfTerms } from './sections/PdfTerms';
import { PdfSignatures } from './sections/PdfSignatures';
import { PdfFooter } from './sections/PdfFooter';

const s = StyleSheet.create({
  page: {
    fontFamily: 'Inter',
    fontSize: 9,
    color: C.g900,
    paddingTop: S.pagePadY,
    paddingBottom: S.pagePadBottom,
    paddingHorizontal: S.pagePadX,
  },
  body: { flexGrow: 1 },
});

export function OfferDocument({ offer }: { offer: PdfOffer }) {
  return (
    <Document title={`Ofertă ${offer.offer_number}`}>
      <Page size="A4" style={s.page}>
        <View style={s.body}>
          <PdfHeader company={offer.company} />
          <PdfTitle />
          <PdfMetaBox offer={offer} />
          {offer.groups.map((g, i) => (
            <PdfGroupTable key={i} group={g} />
          ))}
          <PdfTerms offer={offer} company={offer.company} />
          <PdfSignatures company={offer.company} />
        </View>
        <PdfFooter company={offer.company} offerNumber={offer.offer_number} />
      </Page>
    </Document>
  );
}
