import { db } from '../db/database';
import { nationalHolidays } from '../domain/holidays';
import type { Holiday } from '../types/models';
import { nowISO } from '../utils/format';

/** Todos os feriados, ordenados por data. */
export async function listHolidays(): Promise<Holiday[]> {
  return db.holidays.orderBy('date').toArray();
}

/** Apenas as datas — formato consumido pelo motor de cálculo. */
export async function holidayDates(): Promise<string[]> {
  return (await db.holidays.orderBy('date').keys()) as string[];
}

export async function addHoliday(date: string, name: string): Promise<void> {
  const limpo = name.trim();
  if (!date || !limpo) throw new Error('Informe a data e o nome do feriado.');
  const existente = await db.holidays.get(date);
  if (existente) throw new Error(`Já existe um feriado nessa data: ${existente.name}.`);
  await db.holidays.put({ date, name: limpo, source: 'manual', createdAt: nowISO() });
}

export async function removeHoliday(date: string): Promise<void> {
  await db.holidays.delete(date);
}

export interface GenerateResult {
  adicionados: number;
  jaExistiam: number;
}

/**
 * Gera os feriados nacionais do ano. Datas já cadastradas são preservadas
 * (não sobrescreve um feriado que o usuário tenha ajustado à mão).
 */
export async function generateNationalHolidays(year: number): Promise<GenerateResult> {
  const gerados = nationalHolidays(year);
  return db.transaction('rw', db.holidays, async () => {
    const existentes = new Set((await db.holidays.orderBy('date').keys()) as string[]);
    const novos = gerados.filter((h) => !existentes.has(h.date));
    if (novos.length > 0) {
      await db.holidays.bulkPut(
        novos.map((h) => ({ ...h, source: 'nacional' as const, createdAt: nowISO() })),
      );
    }
    return { adicionados: novos.length, jaExistiam: gerados.length - novos.length };
  });
}

/** Remove todos os feriados de um ano (útil para regerar). */
export async function removeHolidaysOfYear(year: number): Promise<number> {
  const prefixo = `${year}-`;
  const datas = ((await db.holidays.orderBy('date').keys()) as string[]).filter((d) =>
    d.startsWith(prefixo),
  );
  await db.holidays.bulkDelete(datas);
  return datas.length;
}
