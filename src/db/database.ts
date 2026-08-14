import Dexie, { type EntityTable } from 'dexie';
import type { Client, Operation, Receivable, Settings } from '../types/models';

/**
 * Banco local (IndexedDB via Dexie). Índices escolhidos para manter o
 * histórico rápido mesmo com milhares de operações.
 */
export const db = new Dexie('factorcalc') as Dexie & {
  clients: EntityTable<Client, 'id'>;
  operations: EntityTable<Operation, 'id'>;
  receivables: EntityTable<Receivable, 'id'>;
  settings: EntityTable<Settings, 'id'>;
};

db.version(1).stores({
  clients: 'id, name, document, createdAt',
  operations: 'id, operationNumber, clientId, operationDate, status, createdAt',
  receivables: 'id, operationId, dueDate',
  settings: 'id',
});
