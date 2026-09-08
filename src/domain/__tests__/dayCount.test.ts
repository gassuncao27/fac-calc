import { describe, expect, it } from 'vitest';
import {
  addBusinessDaysISO,
  addCompensationDays,
  addDaysISO,
  countDays,
  isValidISODate,
} from '../dayCount';

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

  it('addBusinessDaysISO pula sábados e domingos', () => {
    // 11/09/2026 é sexta: +2 dias úteis cai na terça, não no domingo
    expect(addBusinessDaysISO('2026-09-11', 2)).toBe('2026-09-15');
    // quinta +2 = segunda (atravessa o fim de semana)
    expect(addBusinessDaysISO('2026-09-10', 2)).toBe('2026-09-14');
    // semana cheia
    expect(addBusinessDaysISO('2026-09-11', 5)).toBe('2026-09-18');
  });

  it('addBusinessDaysISO parte do próximo dia útil se a data cair no fim de semana', () => {
    expect(addBusinessDaysISO('2026-09-12', 1)).toBe('2026-09-14'); // sábado → segunda
    expect(addBusinessDaysISO('2026-09-13', 1)).toBe('2026-09-14'); // domingo → segunda
  });

  it('addBusinessDaysISO é seguro com entrada inválida ou zero', () => {
    expect(() => addBusinessDaysISO('', 2)).not.toThrow();
    expect(addBusinessDaysISO('', 2)).toBe('');
    expect(addBusinessDaysISO('abc', 2)).toBe('abc');
    expect(addBusinessDaysISO('2026-09-12', 0)).toBe('2026-09-12');
  });

  it('addCompensationDays escolhe o critério', () => {
    expect(addCompensationDays('2026-09-11', 2, 'calendar')).toBe('2026-09-13'); // domingo
    expect(addCompensationDays('2026-09-11', 2, 'business')).toBe('2026-09-15'); // terça
  });
});
