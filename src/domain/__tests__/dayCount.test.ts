import { describe, expect, it } from 'vitest';
import {
  addBusinessDaysISO,
  addCompensationDays,
  addDaysISO,
  countDays,
  isBusinessDay,
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

  it('pula feriados além dos fins de semana', () => {
    // 12/10/2026 (Nossa Senhora Aparecida) é uma SEGUNDA-feira.
    // Sexta 09/10 + 1 dia útil cairia na segunda 12/10 → com feriado, vai para terça 13/10.
    expect(addBusinessDaysISO('2026-10-09', 1)).toBe('2026-10-12');
    expect(addBusinessDaysISO('2026-10-09', 1, ['2026-10-12'])).toBe('2026-10-13');
  });

  it('pula feriados em sequência (Carnaval)', () => {
    // Carnaval 2026: segunda 16/02 e terça 17/02. Cinzas (18/02) é dia útil.
    const carnaval = ['2026-02-16', '2026-02-17'];
    // Sexta 13/02 + 1 dia útil → quarta de cinzas 18/02
    expect(addBusinessDaysISO('2026-02-13', 1, carnaval)).toBe('2026-02-18');
    // Sexta 13/02 + 2 → quinta 19/02
    expect(addBusinessDaysISO('2026-02-13', 2, carnaval)).toBe('2026-02-19');
  });

  it('feriado emendado com fim de semana', () => {
    // Sexta-Feira Santa 03/04/2026: quinta 02/04 + 1 dia útil pula 03, 04 e 05 → segunda 06/04
    expect(addBusinessDaysISO('2026-04-02', 1, ['2026-04-03'])).toBe('2026-04-06');
  });

  it('feriado no fim de semana não muda nada (já era pulado)', () => {
    // 07/09/2026 é segunda; usar um feriado que caia num domingo não altera
    expect(addBusinessDaysISO('2026-10-09', 1, ['2026-10-11'])).toBe('2026-10-12');
  });

  it('lista de feriados vazia equivale a só pular fins de semana', () => {
    expect(addBusinessDaysISO('2026-09-11', 2, [])).toBe(addBusinessDaysISO('2026-09-11', 2));
  });

  it('isBusinessDay reconhece fim de semana e feriado', () => {
    expect(isBusinessDay('2026-09-11')).toBe(true); // sexta
    expect(isBusinessDay('2026-09-12')).toBe(false); // sábado
    expect(isBusinessDay('2026-09-13')).toBe(false); // domingo
    expect(isBusinessDay('2026-10-12', ['2026-10-12'])).toBe(false); // feriado
    expect(isBusinessDay('')).toBe(false);
  });

  it('aceita Set além de array', () => {
    expect(addBusinessDaysISO('2026-10-09', 1, new Set(['2026-10-12']))).toBe('2026-10-13');
  });

  it('addCompensationDays só considera feriados em dias úteis', () => {
    const feriados = ['2026-10-12'];
    expect(addCompensationDays('2026-10-09', 1, 'business', feriados)).toBe('2026-10-13');
    // em dias corridos, feriado é irrelevante
    expect(addCompensationDays('2026-10-09', 1, 'calendar', feriados)).toBe('2026-10-10');
  });
});
