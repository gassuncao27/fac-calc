/**
 * Feriados.
 *
 * Duas camadas, por decisão de produto:
 *  1. NACIONAIS gerados pelo app — evita digitar ~13 datas por ano e, sobretudo,
 *     evita o erro silencioso de esquecer um feriado (que muda dinheiro).
 *  2. MANUAIS cadastrados pelo usuário — estaduais e municipais variam demais
 *     para virem prontos.
 *
 * Cada feriado é uma DATA ÚNICA (não há recorrência): para o ano seguinte,
 * gera-se a lista nacional de novo e cadastram-se os locais.
 *
 * Quarta-feira de Cinzas NÃO entra: por decisão do usuário, é dia útil
 * (banco abre à tarde).
 *
 * Tudo offline — nenhuma consulta externa.
 */

/** Aritmética de datas em UTC, imune a fuso e horário de verão. */
function toISO(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(
    d.getUTCDate(),
  ).padStart(2, '0')}`;
}

function addUTCDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * 86_400_000);
}

/**
 * Domingo de Páscoa (algoritmo de Meeus/Jones/Butcher, calendário gregoriano).
 * Dele derivam Carnaval, Sexta-Feira Santa e Corpus Christi.
 */
export function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

export interface GeneratedHoliday {
  date: string; // yyyy-MM-dd
  name: string;
}

/** Feriados nacionais (fixos + móveis) de um ano, ordenados por data. */
export function nationalHolidays(year: number): GeneratedHoliday[] {
  const fixos: [string, string][] = [
    ['01-01', 'Confraternização Universal'],
    ['04-21', 'Tiradentes'],
    ['05-01', 'Dia do Trabalho'],
    ['09-07', 'Independência do Brasil'],
    ['10-12', 'Nossa Senhora Aparecida'],
    ['11-02', 'Finados'],
    ['11-15', 'Proclamação da República'],
    ['11-20', 'Consciência Negra'],
    ['12-25', 'Natal'],
  ];

  const pascoa = easterSunday(year);
  const moveis: [number, string][] = [
    [-48, 'Carnaval (segunda)'],
    [-47, 'Carnaval (terça)'],
    [-2, 'Sexta-Feira Santa'],
    [60, 'Corpus Christi'],
  ];

  return [
    ...fixos.map(([md, name]) => ({ date: `${year}-${md}`, name })),
    ...moveis.map(([offset, name]) => ({ date: toISO(addUTCDays(pascoa, offset)), name })),
  ].sort((a, b) => a.date.localeCompare(b.date));
}
