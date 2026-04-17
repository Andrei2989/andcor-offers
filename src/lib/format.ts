// Romanian locale formatters — used by both the editor UI and the PDF.

const numberFmt = new Intl.NumberFormat('ro-RO', { maximumFractionDigits: 2 });

/** 29650 → "29.650", 29650.75 → "29.650,75" */
export function formatNumberRO(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return '';
  return numberFmt.format(n);
}

/** Always appends "RON" with a non-breaking space so the unit never wraps. */
export function formatRON(n: number | null | undefined): string {
  return `${formatNumberRO(n ?? 0)}\u00A0RON`;
}

/** "2026-04-17" → "17.04.2026" */
export function formatDateRO(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}.${m}.${y}`;
}

/**
 * Parses a user-typed number accepting both RO (29.650,75) and EN (29,650.75 / 29650.75) forms.
 * Returns null if the string is empty or invalid.
 */
export function parseNumberLoose(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Decide which char is the decimal separator by picking the LAST one.
  const lastComma = trimmed.lastIndexOf(',');
  const lastDot = trimmed.lastIndexOf('.');
  let normalized: string;
  if (lastComma === -1 && lastDot === -1) {
    normalized = trimmed;
  } else if (lastComma > lastDot) {
    // Comma is the decimal separator. Strip dots (thousands), replace comma with dot.
    normalized = trimmed.replace(/\./g, '').replace(',', '.');
  } else {
    // Dot is the decimal separator. Strip commas (thousands).
    normalized = trimmed.replace(/,/g, '');
  }

  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

export function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
