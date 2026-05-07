import { View, Text, StyleSheet } from '@react-pdf/renderer';
import type { Styles } from '@react-pdf/renderer';

type Style = Styles[string];
import { C } from '../theme';
import { formatNumberRO } from '@/lib/format';
import { groupTotal } from '@/lib/totals';
import type { PdfOfferGroup, PdfOfferItem } from '../types';

const COLS_BASE = [
  { key: 'nr',   flex: 5,  align: 'center' as const },
  { key: 'name', flex: 24, align: 'left'   as const },
  { key: 'ref',  flex: 15, align: 'center' as const },
  { key: 'code', flex: 14, align: 'center' as const },
  { key: 'um',   flex: 6,  align: 'center' as const },
  { key: 'qty',  flex: 7,  align: 'center' as const },
  { key: 'unit', flex: 14, align: 'right'  as const },
  { key: 'val',  flex: 15, align: 'right'  as const },
];

const COLS_WITH_PURCHASE = [
  { key: 'nr',       flex: 5,  align: 'center' as const },
  { key: 'name',     flex: 21, align: 'left'   as const },
  { key: 'ref',      flex: 13, align: 'center' as const },
  { key: 'code',     flex: 12, align: 'center' as const },
  { key: 'um',       flex: 5,  align: 'center' as const },
  { key: 'qty',      flex: 6,  align: 'center' as const },
  { key: 'purchase', flex: 13, align: 'right'  as const },
  { key: 'unit',     flex: 12, align: 'right'  as const },
  { key: 'val',      flex: 13, align: 'right'  as const },
];

const HEADERS_BASE = [
  'Nr.',
  'Denumire produs / serviciu',
  'Reper fabricaţie /\nSerie şasiu',
  'Cod reper',
  'U/M',
  'Cant.',
  'Preţ unitar\n(RON, fără TVA)',
  'Valoare\n(RON, fără TVA)',
];

const HEADERS_WITH_PURCHASE = [
  'Nr.',
  'Denumire produs / serviciu',
  'Reper fabricaţie /\nSerie şasiu',
  'Cod reper',
  'U/M',
  'Cant.',
  'Preţ achiziţie\n(RON, fără TVA)',
  'Preţ unitar\n(RON, fără TVA)',
  'Valoare\n(RON, fără TVA)',
];

const s = StyleSheet.create({
  title: {
    fontSize: 10,
    fontWeight: 700,
    color: C.navy,
    marginBottom: 3,
    marginTop: 2,
  },
  table: { borderWidth: 0.5, borderColor: C.navy, marginBottom: 6 },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: C.navy,
  },
  headerCell: {
    color: C.white,
    fontSize: 7.5,
    fontWeight: 700,
    paddingVertical: 6,
    paddingHorizontal: 4,
    lineHeight: 1.25,
  },
  row: { flexDirection: 'row' },
  rowAlt: { backgroundColor: C.g100 },
  cell: {
    fontSize: 8.5,
    color: C.g900,
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderRightWidth: 0.3,
    borderRightColor: C.g200,
  },
  cellLast: { borderRightWidth: 0 },
  valueCell: { color: C.navy, fontWeight: 700 },
  totalRow: {
    flexDirection: 'row',
    backgroundColor: C.g100,
    borderTopWidth: 0.5,
    borderTopColor: C.navy,
  },
  totalLabel: {
    fontSize: 9,
    color: C.navy,
    fontWeight: 700,
    paddingVertical: 6,
    paddingHorizontal: 6,
    textAlign: 'right',
  },
  totalValue: {
    fontSize: 10,
    color: C.navy,
    fontWeight: 700,
    paddingVertical: 6,
    paddingHorizontal: 4,
    textAlign: 'right',
  },
});

function HeaderRow({ showPurchasePrice }: { showPurchasePrice: boolean }) {
  const COLS = showPurchasePrice ? COLS_WITH_PURCHASE : COLS_BASE;
  const HEADERS = showPurchasePrice ? HEADERS_WITH_PURCHASE : HEADERS_BASE;
  return (
    <View style={s.headerRow} fixed>
      {HEADERS.map((h, i) => (
        <Text
          key={i}
          style={[
            s.headerCell,
            { flex: COLS[i].flex, textAlign: COLS[i].align },
          ]}
        >
          {h}
        </Text>
      ))}
    </View>
  );
}

function ItemRow({ item, idx, alt, showPurchasePrice }: { item: PdfOfferItem; idx: number; alt: boolean; showPurchasePrice: boolean }) {
  const COLS = showPurchasePrice ? COLS_WITH_PURCHASE : COLS_BASE;
  const cells = showPurchasePrice
    ? [
        String(idx + 1),
        item.name,
        item.manufacturer_ref,
        item.part_code,
        item.unit,
        formatNumberRO(item.quantity),
        formatNumberRO(item.purchase_price),
        formatNumberRO(item.unit_price),
        formatNumberRO(item.quantity * item.unit_price),
      ]
    : [
        String(idx + 1),
        item.name,
        item.manufacturer_ref,
        item.part_code,
        item.unit,
        formatNumberRO(item.quantity),
        formatNumberRO(item.unit_price),
        formatNumberRO(item.quantity * item.unit_price),
      ];
  const valIdx = cells.length - 1;
  return (
    <View style={alt ? [s.row, s.rowAlt] : s.row} wrap={false}>
      {cells.map((c, i) => {
        const styles: Style[] = [
          s.cell,
          { flex: COLS[i].flex, textAlign: COLS[i].align },
        ];
        if (i === valIdx) styles.push(s.valueCell);
        if (i === cells.length - 1) styles.push(s.cellLast);
        return <Text key={i} style={styles}>{c}</Text>;
      })}
    </View>
  );
}

function TotalRow({ total, showPurchasePrice }: { total: number; showPurchasePrice: boolean }) {
  const COLS = showPurchasePrice ? COLS_WITH_PURCHASE : COLS_BASE;
  const valCol = COLS[COLS.length - 1];
  const labelFlex = COLS.slice(0, COLS.length - 1).reduce((acc, c) => acc + c.flex, 0);
  return (
    <View style={s.totalRow} wrap={false}>
      <Text style={[s.totalLabel, { flex: labelFlex }]}>TOTAL (fără TVA)</Text>
      <Text style={[s.totalValue, { flex: valCol.flex }]}>
        {formatNumberRO(total)}{' '}RON
      </Text>
    </View>
  );
}

export function PdfGroupTable({ group, showPurchasePrice = false }: { group: PdfOfferGroup; showPurchasePrice?: boolean }) {
  const total = groupTotal({ id: '', title: '', sort_order: 0, items: group.items.map((i, idx) => ({ ...i, id: `${idx}` })) });
  return (
    <View>
      <Text style={s.title}>{group.title}</Text>
      <View style={s.table}>
        <HeaderRow showPurchasePrice={showPurchasePrice} />
        {group.items.map((item, idx) => (
          <ItemRow key={idx} item={item} idx={idx} alt={idx % 2 === 1} showPurchasePrice={showPurchasePrice} />
        ))}
        <TotalRow total={total} showPurchasePrice={showPurchasePrice} />
      </View>
    </View>
  );
}
