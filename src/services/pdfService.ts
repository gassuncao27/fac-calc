import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Client, Operation, Receivable, Settings } from '../types/models';
import { operationStatusLabel, operationTypeLabel } from '../constants';
import { formatCents, formatDate, formatNumber, formatPercent } from '../utils/format';

const SLATE = '#0f172a';
const GRAY = '#64748b';
const LIGHT_LINE = '#e2e8f0';

/**
 * Gera a "Memória de Cálculo" da operação em PDF, com visual limpo.
 * Preparado para futuramente receber logo/dados completos da empresa
 * a partir das configurações.
 */
export function generateOperationPdf(
  operation: Operation,
  receivables: Receivable[],
  client: Client | null,
  settings: Settings,
): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 16;
  let y = 20;

  // Cabeçalho
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(SLATE);
  doc.text(settings.companyName || 'FactorCalc', margin, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(GRAY);
  const headerRight = [`${operation.operationNumber}`, `Emitido em ${formatDate(new Date().toISOString().slice(0, 10))}`];
  headerRight.forEach((line, i) => {
    doc.text(line, pageWidth - margin, y - 4 + i * 4.5, { align: 'right' });
  });
  if (settings.companyDocument) {
    y += 5;
    doc.text(`CNPJ: ${settings.companyDocument}`, margin, y);
  }

  y += 8;
  doc.setDrawColor(LIGHT_LINE);
  doc.line(margin, y, pageWidth - margin, y);
  y += 9;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(SLATE);
  doc.text('Memória de Cálculo', margin, y);
  y += 9;

  // Dados da operação
  const info: [string, string][] = [
    ['Cliente', client ? client.name : '—'],
    ['Data da operação', formatDate(operation.operationDate)],
    ['Tipo', operationTypeLabel(operation.operationType)],
    ['Status', operationStatusLabel(operation.status)],
    ['Taxa comercial', `${formatPercent(operation.monthlyRate)} a.m.`],
    ['Base de dias', String(operation.dayBase)],
  ];
  doc.setFontSize(9);
  const colWidth = (pageWidth - margin * 2) / 3;
  info.forEach(([label, value], i) => {
    const x = margin + (i % 3) * colWidth;
    const rowY = y + Math.floor(i / 3) * 12;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(GRAY);
    doc.text(label, x, rowY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(SLATE);
    doc.text(value, x, rowY + 4.5);
  });
  y += Math.ceil(info.length / 3) * 12 + 4;

  // Tabela de títulos
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['Documento', 'Valor nominal', 'Vencimento', 'Dias', 'Taxa', 'Desconto', 'Despesas', 'Líquido']],
    body: receivables.map((r) => [
      r.documentNumber || '—',
      formatCents(r.nominalAmountCents),
      formatDate(r.dueDate),
      String(r.days),
      formatPercent(r.rate),
      formatCents(r.discountAmountCents),
      formatCents(r.expensesCents),
      formatCents(r.netAmountCents),
    ]),
    styles: { font: 'helvetica', fontSize: 8.5, textColor: SLATE, cellPadding: 2.2 },
    headStyles: { fillColor: '#f1f5f9', textColor: GRAY, fontStyle: 'bold' },
    columnStyles: {
      1: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right' },
      6: { halign: 'right' },
      7: { halign: 'right' },
    },
    alternateRowStyles: { fillColor: '#fafafa' },
  });

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

  // Resumo
  const summary: [string, string, boolean][] = [
    ['Valor nominal', formatCents(operation.nominalAmountCents), false],
    ['Prazo médio', `${formatNumber(operation.averageTermDays, 1)} dias`, false],
    ['Taxa comercial', `${formatPercent(operation.monthlyRate)} a.m.`, false],
    ['Deságio', formatCents(operation.discountAmountCents), false],
    ['Tarifas', formatCents(operation.totalFeesCents), false],
    ['Outras despesas', formatCents(operation.totalExpensesCents), false],
    ['VALOR LÍQUIDO', formatCents(operation.netAmountCents), true],
    [
      'Taxa efetiva',
      operation.effectiveMonthlyRate === null ? '—' : `${formatPercent(operation.effectiveMonthlyRate)} a.m.`,
      false,
    ],
    [
      'Taxa efetiva anual',
      operation.effectiveAnnualRate === null ? '—' : `${formatPercent(operation.effectiveAnnualRate)} a.a.`,
      false,
    ],
  ];

  const boxWidth = 78;
  const boxX = pageWidth - margin - boxWidth;
  summary.forEach(([label, value, highlight]) => {
    if (y > 265) {
      doc.addPage();
      y = 20;
    }
    doc.setFontSize(highlight ? 11 : 9);
    doc.setFont('helvetica', highlight ? 'bold' : 'normal');
    doc.setTextColor(highlight ? SLATE : GRAY);
    doc.text(label, boxX, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(SLATE);
    doc.text(value, pageWidth - margin, y, { align: 'right' });
    if (highlight) {
      doc.setDrawColor(SLATE);
      doc.line(boxX, y - 6, pageWidth - margin, y - 6);
      doc.line(boxX, y + 2.5, pageWidth - margin, y + 2.5);
    }
    y += highlight ? 9 : 6.5;
  });

  // Observações
  if (operation.notes) {
    y += 4;
    if (y > 255) {
      doc.addPage();
      y = 20;
    }
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(GRAY);
    doc.text('Observações', margin, y);
    doc.setTextColor(SLATE);
    const lines = doc.splitTextToSize(operation.notes, pageWidth - margin * 2);
    doc.text(lines, margin, y + 5);
  }

  // Rodapé em todas as páginas
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(GRAY);
    doc.text('Documento gerado eletronicamente.', margin, 288);
    doc.text(`Página ${i} de ${pageCount}`, pageWidth - margin, 288, { align: 'right' });
  }

  doc.save(`${operation.operationNumber}-memoria-de-calculo.pdf`);
}
