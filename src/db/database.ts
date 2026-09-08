import Dexie, { type EntityTable } from 'dexie';
import type { Client, Holiday, Operation, Receivable, Settings } from '../types/models';

/**
 * Banco local (IndexedDB via Dexie). Índices escolhidos para manter o
 * histórico rápido mesmo com milhares de operações.
 */
export const db = new Dexie('factorcalc') as Dexie & {
  clients: EntityTable<Client, 'id'>;
  operations: EntityTable<Operation, 'id'>;
  receivables: EntityTable<Receivable, 'id'>;
  settings: EntityTable<Settings, 'id'>;
  holidays: EntityTable<Holiday, 'date'>;
};

db.version(1).stores({
  clients: 'id, name, document, createdAt',
  operations: 'id, operationNumber, clientId, operationDate, status, createdAt',
  receivables: 'id, operationId, dueDate',
  settings: 'id',
});

// v2: feriados. A data é a chave primária, garantindo um feriado por dia.
// Dexie migra bases existentes automaticamente, sem perder dados.
db.version(2).stores({
  clients: 'id, name, document, createdAt',
  operations: 'id, operationNumber, clientId, operationDate, status, createdAt',
  receivables: 'id, operationId, dueDate',
  settings: 'id',
  holidays: 'date, source',
});
