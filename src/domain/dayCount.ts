import { addDays, differenceInCalendarDays, format, isValid, parseISO } from 'date-fns';
import type { DayCountMode } from '../types/models';

/**
 * Datas digitadas à mão passam por estados incompletos ('' , '0008-01-01'…)
 * enquanto o usuário digita. Nada aqui pode lançar exceção por causa disso:
 * um throw durante o render derruba a árvore do React e deixa a tela branca.
 */
export function isValidISODate(iso: string): boolean {
  if (!iso || iso.length < 10) return false;
  return isValid(parseISO(iso));
}

/** Soma dias a uma data ISO. Data inválida volta como veio, sem lançar. */
export function addDaysISO(iso: string, days: number): string {
  if (!isValidISODate(iso) || !Number.isFinite(days) || days === 0) return iso;
  return format(addDays(parseISO(iso), days), 'yyyy-MM-dd');
}

/** Conjunto de feriados no formato yyyy-MM-dd. */
export type HolidaySet = ReadonlySet<string> | readonly string[];

function toSet(holidays?: HolidaySet): ReadonlySet<string> {
  if (!holidays) return EMPTY_HOLIDAYS;
  return Array.isArray(holidays) ? new Set(holidays) : (holidays as ReadonlySet<string>);
}

const EMPTY_HOLIDAYS: ReadonlySet<string> = new Set();

/** Dia útil = não é sábado, não é domingo e não está na lista de feriados. */
export function isBusinessDay(iso: string, holidays?: HolidaySet): boolean {
  if (!isValidISODate(iso)) return false;
  const dow = parseISO(iso).getDay();
  if (dow === 0 || dow === 6) return false;
  return !toSet(holidays).has(iso);
}

/**
 * Soma dias ÚTEIS a uma data ISO, pulando sábados, domingos e os feriados
 * informados. Se a própria data cair em dia não útil, a contagem avança até
 * o próximo dia útil (sexta+1, sábado+1 e domingo+1 caem todos na segunda).
 * Data inválida volta como veio, sem lançar.
 *
 * A lista de feriados vem de fora (banco local) — ver domain/holidays.ts.
 */
export function addBusinessDaysISO(iso: string, days: number, holidays?: HolidaySet): string {
  if (!isValidISODate(iso) || !Number.isFinite(days) || days <= 0) return iso;
  const set = toSet(holidays);
  let date = parseISO(iso);
  let remaining = Math.trunc(days);
  // Limite defensivo: impede laço infinito se a lista de feriados for absurda.
  let guard = 0;
  while (remaining > 0 && guard < 10_000) {
    date = addDays(date, 1);
    guard++;
    const candidate = format(date, 'yyyy-MM-dd');
    const dow = date.getDay();
    if (dow !== 0 && dow !== 6 && !set.has(candidate)) remaining--;
  }
  return format(date, 'yyyy-MM-dd');
}

/**
 * Ponto único de aplicação da compensação D+x: escolhe entre dias corridos
 * e dias úteis conforme o critério da operação.
 */
export function addCompensationDays(
  iso: string,
  days: number,
  mode: DayCountMode,
  holidays?: HolidaySet,
): string {
  return mode === 'business' ? addBusinessDaysISO(iso, days, holidays) : addDaysISO(iso, days);
}

/**
 * Contagem de dias entre a data da operação e o vencimento.
 * V1: dias corridos. A assinatura já recebe o modo para permitir
 * implementar dias úteis + calendário de feriados na V2 sem tocar na UI.
 */
export function countDays(operationDate: string, dueDate: string, mode: DayCountMode = 'calendar'): number {
  if (mode === 'business') {
    // Preparado para V2: dias úteis com calendário local de feriados.
    throw new Error('Contagem por dias úteis ainda não implementada.');
  }
  if (!isValidISODate(operationDate) || !isValidISODate(dueDate)) return 0;
  const diff = differenceInCalendarDays(parseISO(dueDate), parseISO(operationDate));
  return Number.isFinite(diff) ? diff : 0;
}
