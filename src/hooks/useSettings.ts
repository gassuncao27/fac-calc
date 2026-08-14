import { useLiveQuery } from 'dexie-react-hooks';
import { DEFAULT_SETTINGS } from '../constants';
import { getSettings } from '../services/settingsService';
import type { Settings } from '../types/models';

/** Configurações reativas (atualiza a UI quando algo muda no banco). */
export function useSettings(): Settings {
  return useLiveQuery(() => getSettings(), [], DEFAULT_SETTINGS);
}
