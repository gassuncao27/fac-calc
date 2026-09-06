import type { Client, Operation, Receivable } from '../types/models';
import { operationTypeLabel, operationStatusLabel } from '../constants';
import { formatDate, formatNumber } from './../utils/format';
import { downloadText } from '../utils/download';

/**
 * CSV compatível com Excel brasileiro: separador ";", BOM UTF-8 e
 * números com vírgula decimal.
 */
function toCsv(rows: (string | number)[][]): string {
  const body = rows
    .map((row) =>
      row
        .map((cell) => {
          const text = String(cell);
          return /[";\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
        })
        .join(';'),
    )
    .join('\r\n');
  return '﻿' + body;
}

function csvMoney(cents: number): string {
  return formatNumber(cents / 100, 2);
}

export function exportReceivablesCsv(operation: Operation, receivables: Receivable[]): void {
  const rows: (string | number)[][] = [
    ['Documento', 'Valor nominal', 'Vencimento', 'Compensação', 'Dias', 'Taxa', 'Desconto', 'Despesas', 'Valor líquido'],
    ...receivables.map((r) => [
      r.documentNumber,
      csvMoney(r.nominalAmountCents),
      formatDate(r.dueDate),
      formatDate(r.compensationDate ?? r.dueDate),
      r.days,
      formatNumber(r.rate, 2),
      csvMoney(r.discountAmountCents),
      csvMoney(r.expensesCents),
      csvMoney(r.netAmountCents),
    ]),
  ];
  downloadText(toCsv(rows), `${operation.operationNumber}-titulos.csv`, 'text/csv;charset=utf-8');
}

export function exportAllDataCsv(
  operations: Operation[],
  clients: Client[],
  receivables: Receivable[],
): void {
  const clientName = (id: string | null) => clients.find((c) => c.id === id)?.name ?? '';

  const operationRows: (string | number)[][] = [
    [
      'Número',
      'Data',
      'Cliente',
      'Tipo',
      'Status',
      'Taxa mensal',
      'Compensação (D+x)',
      'Valor nominal',
      'Desconto',
      'Tarifas',
      'Despesas',
      'IOF',
      'Valor líquido',
      'Prazo médio (dias)',
      'Taxa efetiva mensal',
      'Taxa efetiva anual',
    ],
    ...operations.map((op) => [
      op.operationNumber,
      formatDate(op.operationDate),
      clientName(op.clientId),
      operationTypeLabel(op.operationType),
      operationStatusLabel(op.status),
      formatNumber(op.monthlyRate, 2),
      String(op.compensationDays ?? 0),
      csvMoney(op.nominalAmountCents),
      csvMoney(op.discountAmountCents),
      csvMoney(op.totalFeesCents),
      csvMoney(op.totalExpensesCents),
      csvMoney(op.iofAmountCents ?? 0),
      csvMoney(op.netAmountCents),
      formatNumber(op.averageTermDays, 1),
      op.effectiveMonthlyRate === null ? '' : formatNumber(op.effectiveMonthlyRate, 2),
      op.effectiveAnnualRate === null ? '' : formatNumber(op.effectiveAnnualRate, 2),
    ]),
  ];

  const numberByOperation = new Map(operations.map((op) => [op.id, op.operationNumber]));
  const receivableRows: (string | number)[][] = [
    ['Operação', 'Documento', 'Valor nominal', 'Vencimento', 'Compensação', 'Dias', 'Taxa', 'Desconto', 'Despesas', 'Valor líquido'],
    ...receivables.map((r) => [
      numberByOperation.get(r.operationId) ?? '',
      r.documentNumber,
      csvMoney(r.nominalAmountCents),
      formatDate(r.dueDate),
      formatDate(r.compensationDate ?? r.dueDate),
      r.days,
      formatNumber(r.rate, 2),
      csvMoney(r.discountAmountCents),
      csvMoney(r.expensesCents),
      csvMoney(r.netAmountCents),
    ]),
  ];

  const today = new Date().toISOString().slice(0, 10);
  downloadText(toCsv(operationRows), `factorcalc-operacoes-${today}.csv`, 'text/csv;charset=utf-8');
  downloadText(toCsv(receivableRows), `factorcalc-titulos-${today}.csv`, 'text/csv;charset=utf-8');
}
