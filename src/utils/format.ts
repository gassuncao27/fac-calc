import { format, parseISO } from 'date-fns';

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const decimalFormatters = new Map<number, Intl.NumberFormat>();

function decimalFormatter(digits: number): Intl.NumberFormat {
  let formatter = decimalFormatters.get(digits);
  if (!formatter) {
    formatter = new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });
    decimalFormatters.set(digits, formatter);
  }
  return formatter;
}

/** R$ 10.000,00 a partir de centavos. */
export function formatCents(cents: number): string {
  return currencyFormatter.format(cents / 100);
}

/** 2,50% a partir de percentual numérico (2.5). */
export function formatPercent(value: number, digits = 2): string {
  return `${decimalFormatter(digits).format(value)}%`;
}

export function formatNumber(value: number, digits = 2): string {
  return decimalFormatter(digits).format(value);
}

/** 42,7 dias */
export function formatDays(value: number): string {
  return `${decimalFormatter(1).format(value)} dias`;
}

/** dd/MM/yyyy a partir de yyyy-MM-dd. */
export function formatDate(isoDate: string): string {
  try {
    return format(parseISO(isoDate), 'dd/MM/yyyy');
  } catch {
    return isoDate;
  }
}

export function formatDateTime(isoDateTime: string): string {
  try {
    return format(parseISO(isoDateTime), "dd/MM/yyyy 'às' HH:mm");
  } catch {
    return isoDateTime;
  }
}

export function todayISO(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

export function nowISO(): string {
  return new Date().toISOString();
}

/**
 * Converte texto digitado em número, aceitando formatos brasileiros:
 * "10000" → 10000 | "10.000,50" → 10000.5 | "1,5" → 1.5 | "1.5" → 1.5
 */
export function parseLocaleNumber(raw: string): number | null {
  const text = raw.replace(/[R$%\s]/g, '').trim();
  if (!text) return null;
  let normalized = text;
  const hasComma = text.includes(',');
  const hasDot = text.includes('.');
  if (hasComma) {
    // vírgula é o separador decimal; pontos são milhares
    normalized = text.replace(/\./g, '').replace(',', '.');
  } else if (hasDot) {
    const parts = text.split('.');
    const last = parts[parts.length - 1];
    // um único ponto seguido de 1-2 dígitos → decimal ("1.5"); senão milhares ("10.000")
    normalized = parts.length === 2 && last.length <= 2 ? text : parts.join('');
  }
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

/** Texto → centavos (inteiro), ou null se inválido. */
export function parseCurrencyToCents(raw: string): number | null {
  const value = parseLocaleNumber(raw);
  if (value === null) return null;
  return Math.round(value * 100);
}
