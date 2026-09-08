import { z } from 'zod';
import { db } from '../db/database';
import { DEFAULT_SETTINGS } from '../constants';
import type { Client, Holiday, Operation, Receivable, Settings } from '../types/models';
import { downloadText } from '../utils/download';

const BACKUP_VERSION = 1;

export interface BackupFile {
  app: 'FactorCalc';
  version: number;
  exportedAt: string;
  clients: Client[];
  operations: Operation[];
  receivables: Receivable[];
  settings: Settings | null;
  /** Opcional: backups anteriores à tela de Feriados não trazem esta lista */
  holidays?: Holiday[];
}

const clientSchema = z.object({
  id: z.string(),
  name: z.string(),
  tradeName: z.string().optional(),
  document: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  notes: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const operationSchema = z.object({
  id: z.string(),
  operationNumber: z.string(),
  clientId: z.string().nullable(),
  operationDate: z.string(),
  operationType: z.enum(['duplicata', 'cheque', 'nota_promissoria', 'outro']),
  status: z.enum(['simulacao', 'fechada', 'cancelada']),
  monthlyRate: z.number(),
  dayBase: z.number(),
  calculationMethod: z.enum(['simple_monthly']),
  fixedFeeCents: z.number(),
  percentageFee: z.number(),
  otherExpensesCents: z.number(),
  compensationDays: z.number().optional().default(0),
  compensationMode: z.enum(['calendar', 'business']).optional().default('calendar'),
  // Opcionais: backups gerados antes do IOF continuam sendo aceitos
  iofEnabled: z.boolean().optional().default(false),
  iofDailyRate: z.number().optional().default(0),
  iofAdditionalRate: z.number().optional().default(0),
  iofPrincipalCents: z.number().optional().default(0),
  iofAdditionalCents: z.number().optional().default(0),
  iofAmountCents: z.number().optional().default(0),
  nominalAmountCents: z.number(),
  discountAmountCents: z.number(),
  totalFeesCents: z.number(),
  totalExpensesCents: z.number(),
  netAmountCents: z.number(),
  averageTermDays: z.number(),
  effectiveMonthlyRate: z.number().nullable(),
  effectiveAnnualRate: z.number().nullable(),
  notes: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const receivableSchema = z.object({
  id: z.string(),
  operationId: z.string(),
  documentNumber: z.string(),
  nominalAmountCents: z.number(),
  dueDate: z.string(),
  compensationDate: z.string().optional(),
  days: z.number(),
  rate: z.number(),
  discountAmountCents: z.number(),
  expensesCents: z.number(),
  netAmountCents: z.number(),
  notes: z.string().optional(),
})
  // Títulos gravados antes da compensação: a data de compensação é o vencimento.
  .transform((r) => ({ ...r, compensationDate: r.compensationDate ?? r.dueDate }));

const settingsSchema = z
  .object({
    id: z.literal('app'),
    companyName: z.string(),
    companyDocument: z.string(),
    isFactoring: z.boolean().optional().default(false),
    iofDailyRate: z.number().optional().default(0.0082),
    iofAdditionalRate: z.number().optional().default(0.95),
    defaultCompensationDays: z.number().optional().default(2),
    defaultCompensationMode: z.enum(['calendar', 'business']).optional().default('business'),
    defaultRate: z.number(),
    defaultDayBase: z.number(),
    defaultFixedFeeCents: z.number(),
    defaultPercentageFee: z.number(),
    defaultCalculationMethod: z.enum(['simple_monthly']),
    decimalPlaces: z.number(),
    pinEnabled: z.boolean(),
    pinHash: z.string().nullable(),
    operationCounters: z.record(z.number()),
  })
  .nullable();

const holidaySchema = z.object({
  date: z.string(),
  name: z.string(),
  source: z.enum(['nacional', 'manual']).optional().default('manual'),
  createdAt: z.string().optional().default(''),
});

const backupSchema = z.object({
  app: z.literal('FactorCalc'),
  version: z.number(),
  exportedAt: z.string(),
  clients: z.array(clientSchema),
  operations: z.array(operationSchema),
  receivables: z.array(receivableSchema),
  settings: settingsSchema,
  holidays: z.array(holidaySchema).optional().default([]),
});

export async function exportBackup(): Promise<void> {
  const [clients, operations, receivables, settings, holidays] = await Promise.all([
    db.clients.toArray(),
    db.operations.toArray(),
    db.receivables.toArray(),
    db.settings.get('app'),
    db.holidays.orderBy('date').toArray(),
  ]);
  const backup: BackupFile = {
    app: 'FactorCalc',
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    clients,
    operations,
    receivables,
    settings: settings ? { ...DEFAULT_SETTINGS, ...settings } : null,
    holidays,
  };
  const today = new Date().toISOString().slice(0, 10);
  downloadText(JSON.stringify(backup, null, 2), `factorcalc-backup-${today}.json`, 'application/json');
}

export interface BackupPreview {
  clients: number;
  operations: number;
  receivables: number;
  holidays: number;
  exportedAt: string;
  data: BackupFile;
}

/** Valida o arquivo e devolve um resumo antes da confirmação do usuário. */
export function parseBackup(jsonText: string): BackupPreview {
  let raw: unknown;
  try {
    raw = JSON.parse(jsonText);
  } catch {
    throw new Error('O arquivo selecionado não é um JSON válido.');
  }
  const parsed = backupSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error('O arquivo não é um backup válido do FactorCalc.');
  }
  const data = parsed.data as BackupFile;
  return {
    clients: data.clients.length,
    operations: data.operations.length,
    receivables: data.receivables.length,
    holidays: data.holidays?.length ?? 0,
    exportedAt: data.exportedAt,
    data,
  };
}

/** Substitui todos os dados locais pelos do backup (após confirmação do usuário). */
export async function restoreBackup(backup: BackupFile): Promise<void> {
  await db.transaction('rw', db.clients, db.operations, db.receivables, db.settings, db.holidays, async () => {
    await Promise.all([
      db.clients.clear(),
      db.operations.clear(),
      db.receivables.clear(),
      db.settings.clear(),
      db.holidays.clear(),
    ]);
    await db.clients.bulkAdd(backup.clients);
    await db.operations.bulkAdd(backup.operations);
    await db.receivables.bulkAdd(backup.receivables);
    if (backup.holidays?.length) await db.holidays.bulkPut(backup.holidays);
    if (backup.settings) {
      await db.settings.put({ ...DEFAULT_SETTINGS, ...backup.settings });
    }
  });
}
