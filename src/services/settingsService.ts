import { DEFAULT_SETTINGS } from '../constants';
import { db } from '../db/database';
import type { Settings } from '../types/models';

export async function getSettings(): Promise<Settings> {
  const stored = await db.settings.get('app');
  return { ...DEFAULT_SETTINGS, ...stored };
}

export async function saveSettings(patch: Partial<Settings>): Promise<Settings> {
  const current = await getSettings();
  const next: Settings = { ...current, ...patch, id: 'app' };
  await db.settings.put(next);
  return next;
}

/** Gera o próximo número amigável (OP-AAAA-NNNNNN) de forma atômica. */
export async function nextOperationNumber(year: number): Promise<string> {
  return db.transaction('rw', db.settings, async () => {
    const current = await getSettings();
    const key = String(year);
    const next = (current.operationCounters[key] ?? 0) + 1;
    await db.settings.put({
      ...current,
      operationCounters: { ...current.operationCounters, [key]: next },
    });
    return `OP-${year}-${String(next).padStart(6, '0')}`;
  });
}
