const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz'

/** RFC4122-ish id that works on http:// and in jsdom without crypto.randomUUID. */
export function uid(prefix = 'id'): string {
  const cryptoObj = globalThis.crypto as Crypto | undefined
  let body = ''
  if (cryptoObj && typeof cryptoObj.getRandomValues === 'function') {
    const bytes = new Uint8Array(12)
    cryptoObj.getRandomValues(bytes)
    body = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  } else {
    for (let i = 0; i < 24; i += 1) {
      body += ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
    }
  }
  return `${prefix}_${Date.now().toString(36)}${body.slice(0, 12)}`
}

/** Deterministic 32-bit hash used for stable tie-breaks and avatar seeds. */
export function hash32(input: string): number {
  let h = 2166136261
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}
