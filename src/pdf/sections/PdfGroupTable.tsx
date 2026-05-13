import { View, Text, StyleSheet } from '@react-pdf/renderer';
import type { Styles } from '@react-pdf/renderer';

type Style = Styles[string];
import { C } from '../theme';
import { formatNumberRO } from '@/lib/format';
import { groupTotal } from '@/lib/totals';
import type { PdfOfferGroup, PdfOfferItem } from '../types';

const HEADER_LABELS: Record<string, string> = {
  nr:       'Nr.',
  name:     'Denumire produs / serviciu',
  ref:      'Reper fabricaţie /\nSerie şasiu',
  code:     'Cod reper',
  um:       'U/M',
  qty:      'Cant.',
  purchase: 'Preţ achiziţie\n(RON, fără TVA)',
  unit:     'Preţ unitar\n(RON, fără TVA)',
  val:      'Valoare\n(RON, fără TVA)',
};

const ALL_COLS = [
  { key: 'nr',       flex: 5,  align: 'center' as const },
  { key: 'name',     flex: 24, align: 'left'   as const },
  { key: 'ref',      flex: 15, align: 'center' as const },
  { key: 'code',     flex: 14, align: 'center' as const },
  { key: 'um',       flex: 6,  align: 'center' as const },
  { key: 'qty',      flex: 7,  align: 'center' as const },
  { key: 'purchase', flex: 13, align: 'right'  as const },
  { key: 'unit',     flex: 14, align: 'right'  as const },
  { key: 'val',      flex: 15, align: 'right'  as const },
];

function buildCols(showPurchasePrice: boolean, showPartCode: boolean) {
  return ALL_COLS.filter((c) => {
    if (c.key === 'code' && !showPartCode) return false;
    if (c.key === 'purchase' && !showPurchasePrice) return false;
    return true;
  });
}

function buildCells(item: PdfOfferItem, idx: number, showPurchasePrice: boolean, showPartCode: boolean): string[] {
  const all: Record<string, string> = {
    nr:       String(idx + 1),
    name:     item.name,
    ref:      item.manufacturer_ref,
    code:     item.part_code,
    um:       item.unit,
    qty:      formatNumberRO(item.quantity),
    purchase: formatNumberRO(item.purchase_price),
    unit:     formatNumberRO(item.unit_price),
    val:      formatNumberRO(item.quantity * item.unit_price),
  };
  return buildCols(showPurchasePrice, showPartCode).map((c) => all[c.key]);
}

const VAT_RATE = 0.21;

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
  vatRow: {
    flexDirection: 'row',
    backgroundColor: C.g100,
  },
  grandTotalRow: {
    borderTopWidth: 0.5,
    borderTopColor: C.navy,
    backgroundColor: C.navy,
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
  grandTotalLabel: {
    fontSize: 9,
    color: C.white,
    fontWeight: 700,
    paddingVertical: 6,
    paddingHorizontal: 6,
    textAlign: 'right',
  },
  grandTotalValue: {
    fontSize: 10,
    color: C.white,
    fontWeight: 700,
    paddingVertical: 6,
    paddingHorizontal: 4,
    textAlign: 'right',
  },
});

function HeaderRow({ showPurchasePrice, showPartCode }: { showPurchasePrice: boolean; showPartCode: boolean }) {
  const cols = buildCols(showPurchasePrice, showPartCode);
  return (
    <View style={s.headerRow} fixed>
      {cols.map((col) => (
        <Text
          key={col.key}
          style={[s.headerCell, { flex: col.flex, textAlign: col.align }]}
        >
          {HEADER_LABELS[col.key]}
        </Text>
      ))}
    </View>
  );
}

function ItemRow({ item, idx, alt, showPurchasePrice, showPartCode }: {
  item: PdfOfferItem;
  idx: number;
  alt: boolean;
  showPurchasePrice: boolean;
  showPartCode: boolean;
}) {
  const cols = buildCols(showPurchasePrice, showPartCode);
  const cells = buildCells(item, idx, showPurchasePrice, showPartCode);
  const valIdx = cells.length - 1;
  return (
    <View style={alt ? [s.row, s.rowAlt] : s.row} wrap={false}>
      {cells.map((c, i) => {
        const styles: Style[] = [s.cell, { flex: cols[i].flex, textAlign: cols[i].align }];
        if (i === valIdx) styles.push(s.valueCell);
        if (i === cells.length - 1) styles.push(s.cellLast);
        return <Text key={i} style={styles}>{c}</Text>;
      })}
    </View>
  );
}

function TotalRows({ total, showPurchasePrice, showPartCode }: { total: number; showPurchasePrice: boolean; showPartCode: boolean }) {
  const cols = buildCols(showPurchasePrice, showPartCode);
  const valCol = cols[cols.length - 1];
  const labelFlex = cols.slice(0, cols.length - 1).reduce((acc, c) => acc + c.flex, 0);
  const vat = total * VAT_RATE;
  const totalWithVat = total * (1 + VAT_RATE);
  return (
    <>
      <View style={s.totalRow} wrap={false}>
        <Text style={[s.totalLabel, { flex: labelFlex }]}>TOTAL (fără TVA)</Text>
        <Text style={[s.totalValue, { flex: valCol.flex }]}>
          {formatNumberRO(total)}{' '}RON
        </Text>
      </View>
      <View style={s.vatRow} wrap={false}>
        <Text style={[s.totalLabel, { flex: labelFlex }]}>TVA (21%)</Text>
        <Text style={[s.totalValue, { flex: valCol.flex }]}>
          {formatNumberRO(vat)}{' '}RON
        </Text>
      </View>
      <View style={[s.grandTotalRow]} wrap={false}>
        <Text style={[s.grandTotalLabel, { flex: labelFlex }]}>TOTAL (cu TVA)</Text>
        <Text style={[s.grandTotalValue, { flex: valCol.flex }]}>
          {formatNumberRO(totalWithVat)}{' '}RON
        </Text>
      </View>
    </>
  );
}

export function PdfGroupTable({ group, showPurchasePrice = false, showPartCode = true }: {
  group: PdfOfferGroup;
  showPurchasePrice?: boolean;
  showPartCode?: boolean;
}) {
  const total = groupTotal({ id: '', title: '', sort_order: 0, items: group.items.map((i, idx) => ({ ...i, id: `${idx}` })) });
  return (
    <View>
      <Text style={s.title}>{group.title}</Text>
      <View style={s.table}>
        <HeaderRow showPurchasePrice={showPurchasePrice} showPartCode={showPartCode} />
        {group.items.map((item, idx) => (
          <ItemRow key={idx} item={item} idx={idx} alt={idx % 2 === 1} showPurchasePrice={showPurchasePrice} showPartCode={showPartCode} />
        ))}
        <TotalRows total={total} showPurchasePrice={showPurchasePrice} showPartCode={showPartCode} />
      </View>
    </View>
  );
}
