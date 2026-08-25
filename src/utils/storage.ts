/**
 * Armazenamento persistente.
 *
 * Por padrão, navegadores podem descartar dados de um site sob pressão de
 * espaço — e o iOS descarta dados de sites não instalados após ~7 dias sem
 * uso. Pedir persistência marca a origem como "não descartável".
 *
 * No iOS/Safari, o pedido é concedido quando o app está na Tela de Início.
 * Falhar aqui nunca é um erro para o usuário: os dados seguem gravados.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (!navigator.storage?.persist) return false;
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch (error) {
    console.warn('Não foi possível solicitar armazenamento persistente.', error);
    return false;
  }
}

export interface StorageStatus {
  persistent: boolean;
  supported: boolean;
  usageBytes: number | null;
}

export async function getStorageStatus(): Promise<StorageStatus> {
  try {
    if (!navigator.storage?.persisted) {
      return { persistent: false, supported: false, usageBytes: null };
    }
    const persistent = await navigator.storage.persisted();
    let usageBytes: number | null = null;
    if (navigator.storage.estimate) {
      const { usage } = await navigator.storage.estimate();
      usageBytes = usage ?? null;
    }
    return { persistent, supported: true, usageBytes };
  } catch (error) {
    console.warn('Não foi possível ler o status do armazenamento.', error);
    return { persistent: false, supported: false, usageBytes: null };
  }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
