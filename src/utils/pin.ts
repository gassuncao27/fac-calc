/**
 * PIN local (4 a 6 dígitos) com hash SHA-256 + salt fixo do app.
 * Proteção de conveniência contra uso casual do aparelho — os dados
 * continuam no IndexedDB do dispositivo (sem servidor).
 */
const SALT = 'factorcalc-local-pin-v1';

async function sha256Hex(text: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const data = new TextEncoder().encode(text);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
  }
  // Fallback simples (contextos sem SubtleCrypto, ex.: http em rede local)
  let hash = 5381;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) + hash + text.charCodeAt(i)) | 0;
  }
  return `djb2-${(hash >>> 0).toString(16)}`;
}

export function isValidPin(pin: string): boolean {
  return /^\d{4,6}$/.test(pin);
}

export async function hashPin(pin: string): Promise<string> {
  return sha256Hex(`${SALT}:${pin}`);
}

export async function verifyPin(pin: string, storedHash: string): Promise<boolean> {
  return (await hashPin(pin)) === storedHash;
}
