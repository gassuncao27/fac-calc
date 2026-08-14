import { addDays, format } from 'date-fns';
import { db } from './database';
import { createClient } from '../services/clientService';
import { saveOperation } from '../services/operationService';
import { generateId } from '../utils/id';
import { todayISO } from '../utils/format';

function iso(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

/**
 * Dados de demonstração — disponível apenas em ambiente de desenvolvimento
 * (botão em Configurações). Nunca é carregado automaticamente.
 */
export async function loadDemoData(): Promise<void> {
  const hasData = (await db.operations.count()) > 0 || (await db.clients.count()) > 0;
  if (hasData) {
    throw new Error('Já existem dados cadastrados. Limpe os dados antes de carregar a demonstração.');
  }

  const [abc, mercantil, silva] = await Promise.all([
    createClient({
      name: 'Comercial ABC Ltda',
      tradeName: 'ABC Distribuidora',
      document: '12.345.678/0001-90',
      phone: '(11) 98765-4321',
      email: 'financeiro@abcdistribuidora.com.br',
      notes: 'Cliente desde 2024. Boa liquidez.',
    }),
    createClient({
      name: 'Mercantil Horizonte S.A.',
      tradeName: 'Horizonte',
      document: '98.765.432/0001-10',
      phone: '(31) 3222-1100',
      email: 'contato@mercantilhorizonte.com.br',
    }),
    createClient({
      name: 'José da Silva ME',
      document: '123.456.789-00',
      phone: '(11) 91234-5678',
    }),
  ]);

  const today = new Date();
  const base = {
    operationType: 'duplicata' as const,
    calculationMethod: 'simple_monthly' as const,
    dayBase: 30,
    fixedFeeCents: 0,
    percentageFee: 0,
    otherExpensesCents: 0,
  };

  // 1. Operação típica com 3 duplicatas, fechada
  await saveOperation({
    ...base,
    clientId: abc.id,
    operationDate: iso(addDays(today, -20)),
    status: 'fechada',
    monthlyRate: 2.5,
    fixedFeeCents: 5_000,
    receivables: [
      { id: generateId(), documentNumber: 'DUP-1041', nominalAmountCents: 1_000_000, dueDate: iso(addDays(today, 12)), expensesCents: 0 },
      { id: generateId(), documentNumber: 'DUP-1042', nominalAmountCents: 1_500_000, dueDate: iso(addDays(today, 27)), expensesCents: 0 },
      { id: generateId(), documentNumber: 'DUP-1043', nominalAmountCents: 800_000, dueDate: iso(addDays(today, 42)), expensesCents: 0 },
    ],
  });

  // 2. Cheques pré-datados com tarifa percentual
  await saveOperation({
    ...base,
    clientId: silva.id,
    operationDate: iso(addDays(today, -10)),
    operationType: 'cheque',
    status: 'fechada',
    monthlyRate: 3.2,
    percentageFee: 0.5,
    receivables: [
      { id: generateId(), documentNumber: 'CH-000871', nominalAmountCents: 350_000, dueDate: iso(addDays(today, 20)), expensesCents: 0 },
      { id: generateId(), documentNumber: 'CH-000872', nominalAmountCents: 350_000, dueDate: iso(addDays(today, 50)), expensesCents: 0 },
    ],
  });

  // 3. Simulação recente com vários títulos
  await saveOperation({
    ...base,
    clientId: mercantil.id,
    operationDate: todayISO(),
    status: 'simulacao',
    monthlyRate: 2.8,
    fixedFeeCents: 3_500,
    otherExpensesCents: 1_500,
    notes: 'Proposta apresentada, aguardando retorno do cliente.',
    receivables: [
      { id: generateId(), documentNumber: 'NF-5501', nominalAmountCents: 2_200_000, dueDate: iso(addDays(today, 30)), expensesCents: 0 },
      { id: generateId(), documentNumber: 'NF-5502', nominalAmountCents: 1_800_000, dueDate: iso(addDays(today, 45)), expensesCents: 0 },
      { id: generateId(), documentNumber: 'NF-5503', nominalAmountCents: 2_600_000, dueDate: iso(addDays(today, 60)), expensesCents: 0 },
      { id: generateId(), documentNumber: 'NF-5504', nominalAmountCents: 1_400_000, dueDate: iso(addDays(today, 75)), expensesCents: 0 },
    ],
  });

  // 4. Operação pequena sem cliente vinculado
  await saveOperation({
    ...base,
    clientId: null,
    operationDate: iso(addDays(today, -5)),
    operationType: 'nota_promissoria',
    status: 'simulacao',
    monthlyRate: 4,
    receivables: [
      { id: generateId(), documentNumber: 'NP-12', nominalAmountCents: 500_000, dueDate: iso(addDays(today, 25)), expensesCents: 0 },
    ],
  });

  // 5. Operação cancelada
  await saveOperation({
    ...base,
    clientId: abc.id,
    operationDate: iso(addDays(today, -35)),
    status: 'cancelada',
    monthlyRate: 2.5,
    notes: 'Cancelada a pedido do cliente.',
    receivables: [
      { id: generateId(), documentNumber: 'DUP-0990', nominalAmountCents: 1_200_000, dueDate: iso(addDays(today, -5)), expensesCents: 0 },
      { id: generateId(), documentNumber: 'DUP-0991', nominalAmountCents: 900_000, dueDate: iso(addDays(today, 10)), expensesCents: 0 },
    ],
  });
}

/** Apaga todos os dados locais (apenas dev/backup). */
export async function clearAllData(): Promise<void> {
  await db.transaction('rw', db.clients, db.operations, db.receivables, db.settings, async () => {
    await Promise.all([db.clients.clear(), db.operations.clear(), db.receivables.clear(), db.settings.clear()]);
  });
}
