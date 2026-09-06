import { describe, expect, it } from 'vitest';
import { addDaysISO, countDays, isValidISODate } from '../dayCount';

describe('datas seguras contra entrada incompleta', () => {
  it('reconhece datas válidas e inválidas', () => {
    expect(isValidISODate('2026-09-06')).toBe(true);
    expect(isValidISODate('')).toBe(false);
    expect(isValidISODate('2026-1')).toBe(false);
    expect(isValidISODate('abc')).toBe(false);
    expect(isValidISODate('0000-00-00')).toBe(false);
  });

  it('addDaysISO soma normalmente em data válida', () => {
    expect(addDaysISO('2026-09-28', 2)).toBe('2026-09-30');
    expect(addDaysISO('2026-09-30', 3)).toBe('2026-10-03'); // vira o mês
  });

  it('addDaysISO devolve a entrada sem lançar quando a data é inválida', () => {
    expect(() => addDaysISO('', 2)).not.toThrow();
    expect(addDaysISO('', 2)).toBe('');
    expect(addDaysISO('abc', 2)).toBe('abc');
    expect(addDaysISO('2026-09-28', Number.NaN)).toBe('2026-09-28');
  });

  it('countDays devolve 0 em vez de NaN com datas inválidas', () => {
    expect(countDays('2026-09-06', '')).toBe(0);
    expect(countDays('', '2026-09-06')).toBe(0);
    expect(countDays('2026-09-06', '2026-10-21')).toBe(45);
  });
});
