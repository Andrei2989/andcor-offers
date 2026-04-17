import { describe, it, expect } from 'vitest';
import { formatNumberRO, formatRON, formatDateRO, parseNumberLoose, addDays } from './format';

describe('formatNumberRO', () => {
  it('formats integers with dot thousand separator', () => {
    expect(formatNumberRO(29650)).toBe('29.650');
    expect(formatNumberRO(1234567)).toBe('1.234.567');
    expect(formatNumberRO(0)).toBe('0');
  });
  it('formats decimals with comma separator', () => {
    expect(formatNumberRO(29650.75)).toBe('29.650,75');
    expect(formatNumberRO(1.5)).toBe('1,5');
  });
  it('handles null/undefined as empty string', () => {
    expect(formatNumberRO(null)).toBe('');
    expect(formatNumberRO(undefined)).toBe('');
  });
});

describe('formatRON', () => {
  it('appends non-breaking space + RON', () => {
    expect(formatRON(29650)).toBe('29.650\u00A0RON');
    expect(formatRON(0)).toBe('0\u00A0RON');
  });
});

describe('formatDateRO', () => {
  it('formats ISO date as dd.mm.yyyy', () => {
    expect(formatDateRO('2026-04-17')).toBe('17.04.2026');
    expect(formatDateRO('2026-04-17T10:00:00Z')).toBe('17.04.2026');
  });
});

describe('parseNumberLoose', () => {
  it('parses RO format with dot thousands and comma decimal', () => {
    expect(parseNumberLoose('29.650,75')).toBe(29650.75);
    expect(parseNumberLoose('1.234.567,89')).toBe(1234567.89);
  });
  it('parses EN format with comma thousands and dot decimal', () => {
    expect(parseNumberLoose('29,650.75')).toBe(29650.75);
  });
  it('parses plain numbers', () => {
    expect(parseNumberLoose('29650')).toBe(29650);
    expect(parseNumberLoose('29650.75')).toBe(29650.75);
  });
  it('returns null for empty/invalid', () => {
    expect(parseNumberLoose('')).toBeNull();
    expect(parseNumberLoose('abc')).toBeNull();
  });
});

describe('addDays', () => {
  it('adds days to an ISO date', () => {
    expect(addDays('2026-04-17', 60)).toBe('2026-06-16');
    expect(addDays('2026-01-01', 31)).toBe('2026-02-01');
  });
});
