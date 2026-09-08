import { describe, expect, it } from 'vitest';
import { easterSunday, nationalHolidays } from '../holidays';

const iso = (d: Date) => d.toISOString().slice(0, 10);

describe('feriados nacionais', () => {
  it('calcula a Páscoa corretamente', () => {
    expect(iso(easterSunday(2024))).toBe('2024-03-31');
    expect(iso(easterSunday(2025))).toBe('2025-04-20');
    expect(iso(easterSunday(2026))).toBe('2026-04-05');
    expect(iso(easterSunday(2027))).toBe('2027-03-28');
    expect(iso(easterSunday(2030))).toBe('2030-04-21');
  });

  it('deriva os móveis a partir da Páscoa', () => {
    const porNome = new Map(nationalHolidays(2026).map((h) => [h.name, h.date]));
    expect(porNome.get('Carnaval (segunda)')).toBe('2026-02-16');
    expect(porNome.get('Carnaval (terça)')).toBe('2026-02-17');
    expect(porNome.get('Sexta-Feira Santa')).toBe('2026-04-03');
    expect(porNome.get('Corpus Christi')).toBe('2026-06-04');
  });

  it('NÃO inclui Quarta-feira de Cinzas (é dia útil por decisão do usuário)', () => {
    const nomes = nationalHolidays(2026).map((h) => h.name);
    expect(nomes.some((n) => /cinzas/i.test(n))).toBe(false);
    // a data existiria em 18/02/2026 — confirma que não está na lista
    expect(nationalHolidays(2026).some((h) => h.date === '2026-02-18')).toBe(false);
  });

  it('traz os fixos, ordenados e sem repetição', () => {
    const lista = nationalHolidays(2027);
    expect(lista).toHaveLength(13);
    expect(lista.map((h) => h.date)).toEqual([...lista.map((h) => h.date)].sort());
    expect(new Set(lista.map((h) => h.date)).size).toBe(13);
    expect(lista.every((h) => h.date.startsWith('2027-'))).toBe(true);
  });
});
