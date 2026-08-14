import { differenceInCalendarDays, parseISO } from 'date-fns';
import type { DayCountMode } from '../types/models';

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
  return differenceInCalendarDays(parseISO(dueDate), parseISO(operationDate));
}
