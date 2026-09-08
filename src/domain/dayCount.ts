import { addBusinessDays, addDays, differenceInCalendarDays, format, isValid, parseISO } from 'date-fns';
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

/**
 * Soma dias ÚTEIS a uma data ISO, pulando sábados e domingos.
 * Se a própria data já cair no fim de semana, a contagem parte do
 * próximo dia útil. Data inválida volta como veio, sem lançar.
 *
 * ATENÇÃO: só considera fins de semana. Feriados (Carnaval, Corpus Christi,
 * feriados bancários) ainda não entram — ver "Preparado para a V2" no README.
 */
export function addBusinessDaysISO(iso: string, days: number): string {
  if (!isValidISODate(iso) || !Number.isFinite(days) || days === 0) return iso;
  return format(addBusinessDays(parseISO(iso), days), 'yyyy-MM-dd');
}

/**
 * Ponto único de aplicação da compensação D+x: escolhe entre dias corridos
 * e dias úteis conforme o critério da operação.
 */
export function addCompensationDays(iso: string, days: number, mode: DayCountMode): string {
  return mode === 'business' ? addBusinessDaysISO(iso, days) : addDaysISO(iso, days);
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
