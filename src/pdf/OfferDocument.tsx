import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import { C, S } from './theme';
import type { PdfOffer } from './types';
import { PdfHeader } from './sections/PdfHeader';
import { PdfTitle } from './sections/PdfTitle';
import { PdfMetaBox } from './sections/PdfMetaBox';
import { PdfGroupTable } from './sections/PdfGroupTable';
import { PdfTerms } from './sections/PdfTerms';
import { PdfClientBox } from './sections/PdfClientBox';
import { PdfFooter } from './sections/PdfFooter';
import { formatNumberRO } from '@/lib/format';

const VAT_RATE = 0.21;

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
  grandTotal: {
    marginTop: 4,
    marginBottom: 8,
    alignSelf: 'flex-end',
    minWidth: 220,
    borderWidth: 0.5,
    borderColor: C.navy,
  },
  gtRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderBottomWidth: 0.3,
    borderBottomColor: C.g200,
    backgroundColor: C.g100,
  },
  gtRowFinal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: C.navy,
  },
  gtLabel: { fontSize: 9, color: C.navy, fontWeight: 700 },
  gtValue: { fontSize: 9, color: C.navy, fontWeight: 700 },
  gtLabelFinal: { fontSize: 10, color: C.white, fontWeight: 700 },
  gtValueFinal: { fontSize: 10, color: C.white, fontWeight: 700 },
});

function PdfGrandTotal({ offer }: { offer: PdfOffer }) {
  if (offer.groups.length <= 1) return null;
  const total = offer.groups.reduce(
    (sum, g) => sum + g.items.reduce((s, i) => s + i.quantity * i.unit_price, 0),
    0,
  );
  const vat = total * VAT_RATE;
  const totalWithVat = total * (1 + VAT_RATE);
  return (
    <View style={s.grandTotal} wrap={false}>
      <View style={s.gtRow}>
        <Text style={s.gtLabel}>TOTAL OFERTĂ (fără TVA)</Text>
        <Text style={s.gtValue}>{formatNumberRO(total)} RON</Text>
      </View>
      <View style={s.gtRow}>
        <Text style={s.gtLabel}>TVA (21%)</Text>
        <Text style={s.gtValue}>{formatNumberRO(vat)} RON</Text>
      </View>
      <View style={s.gtRowFinal}>
        <Text style={s.gtLabelFinal}>TOTAL OFERTĂ (cu TVA)</Text>
        <Text style={s.gtValueFinal}>{formatNumberRO(totalWithVat)} RON</Text>
      </View>
    </View>
  );
}

export function OfferDocument({ offer }: { offer: PdfOffer }) {
  return (
    <Document title={`Ofertă ${offer.offer_number}`}>
      <Page size="A4" style={s.page}>
        <View style={s.body}>
          <PdfHeader company={offer.company} />
          <PdfTitle />
          <PdfMetaBox offer={offer} />
          <PdfClientBox offer={offer} />
          {offer.groups.map((g, i) => (
            <PdfGroupTable key={i} group={g} showPurchasePrice={offer.showPurchasePrice} showPartCode={offer.showPartCode ?? true} />
          ))}
          <PdfGrandTotal offer={offer} />
          <PdfTerms offer={offer} company={offer.company} />
        </View>
        <PdfFooter company={offer.company} offerNumber={offer.offer_number} />
      </Page>
    </Document>
  );
}
