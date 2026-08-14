import { db } from '../db/database';
import type { Client } from '../types/models';
import { generateId } from '../utils/id';
import { nowISO } from '../utils/format';

export type ClientInput = Omit<Client, 'id' | 'createdAt' | 'updatedAt'>;

export async function createClient(input: ClientInput): Promise<Client> {
  const now = nowISO();
  const client: Client = { ...input, id: generateId(), createdAt: now, updatedAt: now };
  await db.clients.add(client);
  return client;
}

export async function updateClient(id: string, input: ClientInput): Promise<void> {
  await db.clients.update(id, { ...input, updatedAt: nowISO() });
}

export async function deleteClient(id: string): Promise<void> {
  await db.transaction('rw', db.clients, db.operations, async () => {
    // Mantém as operações, apenas desvincula o cliente excluído.
    await db.operations.where('clientId').equals(id).modify({ clientId: null });
    await db.clients.delete(id);
  });
}

export function searchClients(clients: Client[], query: string): Client[] {
  const q = query.trim().toLowerCase();
  if (!q) return clients;
  return clients.filter((c) =>
    [c.name, c.tradeName, c.document, c.email, c.phone]
      .filter(Boolean)
      .some((field) => field!.toLowerCase().includes(q)),
  );
}
