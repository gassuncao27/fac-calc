import { calculateOperation } from '../domain/calculations/operation';
import { db } from '../db/database';
import type {
  CalculationMethod,
  Operation,
  OperationStatus,
  OperationType,
  Receivable,
} from '../types/models';
import { generateId } from '../utils/id';
import { nowISO } from '../utils/format';
import { nextOperationNumber } from './settingsService';

export interface ReceivableDraft {
  id: string;
  documentNumber: string;
  nominalAmountCents: number;
  dueDate: string;
  expensesCents: number;
  notes?: string;
}

export interface OperationDraft {
  clientId: string | null;
  operationDate: string;
  operationType: OperationType;
  status: OperationStatus;
  monthlyRate: number;
  dayBase: number;
  calculationMethod: CalculationMethod;
  fixedFeeCents: number;
  percentageFee: number;
  otherExpensesCents: number;
  notes?: string;
  receivables: ReceivableDraft[];
}

/**
 * Persiste a operação e seus títulos com os resultados calculados pelo
 * motor de domínio. Se `existingId` for informado, atualiza a operação
 * preservando número e data de criação.
 */
export async function saveOperation(draft: OperationDraft, existingId?: string): Promise<Operation> {
  const result = calculateOperation({
    operationDate: draft.operationDate,
    monthlyRate: draft.monthlyRate,
    dayBase: draft.dayBase,
    method: draft.calculationMethod,
    fixedFeeCents: draft.fixedFeeCents,
    percentageFee: draft.percentageFee,
    otherExpensesCents: draft.otherExpensesCents,
    receivables: draft.receivables,
  });

  const now = nowISO();

  return db.transaction('rw', db.operations, db.receivables, db.settings, async () => {
    let id: string;
    let operationNumber: string;
    let createdAt: string;

    if (existingId) {
      const existing = await db.operations.get(existingId);
      if (!existing) throw new Error('Operação não encontrada.');
      id = existing.id;
      operationNumber = existing.operationNumber;
      createdAt = existing.createdAt;
      await db.receivables.where('operationId').equals(id).delete();
    } else {
      id = generateId();
      const year = Number(draft.operationDate.slice(0, 4)) || new Date().getFullYear();
      operationNumber = await nextOperationNumber(year);
      createdAt = now;
    }

    const operation: Operation = {
      id,
      operationNumber,
      clientId: draft.clientId,
      operationDate: draft.operationDate,
      operationType: draft.operationType,
      status: draft.status,
      monthlyRate: draft.monthlyRate,
      dayBase: draft.dayBase,
      calculationMethod: draft.calculationMethod,
      fixedFeeCents: draft.fixedFeeCents,
      percentageFee: draft.percentageFee,
      otherExpensesCents: draft.otherExpensesCents,
      nominalAmountCents: result.nominalAmountCents,
      discountAmountCents: result.discountAmountCents,
      totalFeesCents: result.feesAmountCents,
      totalExpensesCents: result.expensesAmountCents,
      netAmountCents: result.netAmountCents,
      averageTermDays: result.averageTermDays,
      effectiveMonthlyRate: result.effectiveMonthlyRate,
      effectiveAnnualRate: result.effectiveAnnualRate,
      notes: draft.notes,
      createdAt,
      updatedAt: now,
    };

    const receivables: Receivable[] = result.receivables.map((r) => ({
      id: r.id || generateId(),
      operationId: id,
      documentNumber: r.documentNumber,
      nominalAmountCents: r.nominalAmountCents,
      dueDate: r.dueDate,
      days: r.days,
      rate: r.rate,
      discountAmountCents: r.discountAmountCents,
      expensesCents: r.expensesCents,
      netAmountCents: r.netAmountCents,
      notes: r.notes,
    }));

    await db.operations.put(operation);
    await db.receivables.bulkAdd(receivables);
    return operation;
  });
}

export async function getOperationWithReceivables(id: string) {
  const operation = await db.operations.get(id);
  if (!operation) return null;
  const receivables = await db.receivables.where('operationId').equals(id).sortBy('dueDate');
  return { operation, receivables };
}

export async function deleteOperation(id: string): Promise<void> {
  await db.transaction('rw', db.operations, db.receivables, async () => {
    await db.receivables.where('operationId').equals(id).delete();
    await db.operations.delete(id);
  });
}

/** Cria uma cópia da operação como nova simulação, com novo número. */
export async function duplicateOperation(id: string): Promise<Operation | null> {
  const data = await getOperationWithReceivables(id);
  if (!data) return null;
  const { operation, receivables } = data;
  return saveOperation({
    clientId: operation.clientId,
    operationDate: operation.operationDate,
    operationType: operation.operationType,
    status: 'simulacao',
    monthlyRate: operation.monthlyRate,
    dayBase: operation.dayBase,
    calculationMethod: operation.calculationMethod,
    fixedFeeCents: operation.fixedFeeCents,
    percentageFee: operation.percentageFee,
    otherExpensesCents: operation.otherExpensesCents,
    notes: operation.notes,
    receivables: receivables.map((r) => ({
      id: generateId(),
      documentNumber: r.documentNumber,
      nominalAmountCents: r.nominalAmountCents,
      dueDate: r.dueDate,
      expensesCents: r.expensesCents,
      notes: r.notes,
    })),
  });
}

export async function updateOperationStatus(id: string, status: OperationStatus): Promise<void> {
  await db.operations.update(id, { status, updatedAt: nowISO() });
}
