/**
 * Rotating challenge–response words for Passphra.si.
 *
 * Each pair shares one random 32-byte secret, created on one phone and copied
 * to the other ONLY through the in-person QR at pairing. From that secret and
 * the current one-minute window, both phones derive two words with HMAC-SHA256
 * (the same construction as 2FA codes, rendered as a word instead of digits):
 *
 *   word("A", window)  — what the phone that SHOWED the QR says
 *   word("B", window)  — what the phone that SCANNED the QR says
 *
 * So each side sees the mirror image of the other: my "say" word is their
 * "expect" word. The two words are independent, so hearing one tells an
 * impostor nothing about the other, and HMAC means one window's words give no
 * hint of the next window's — nothing heard on a call is replayable.
 *
 * The secret is held as a NON-EXTRACTABLE WebCrypto key once saved: page code
 * can use it to make words but cannot read the raw bytes back out.
 */
import { wordAt, wordCount, WORD_LIST_VERSION, type WordLocale } from "./words";

export const WINDOW_MS = 60_000;
export const SECRET_BYTES = 32;

/** Which side of the pairing this phone is. "A" showed the QR, "B" scanned it. */
export type PairRole = "A" | "B";

const QR_PREFIX = "PASSPHRASI1";

export function currentWindow(now: number = Date.now()): number {
  return Math.floor(now / WINDOW_MS);
}

export function msLeftInWindow(now: number = Date.now()): number {
  return WINDOW_MS - (now % WINDOW_MS);
}

export function newSecret(): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(SECRET_BYTES);
  crypto.getRandomValues(bytes);
  return bytes;
}

/** Turns raw secret bytes into a key that can make words but can't be read back. */
export function importSecret(secret: Uint8Array<ArrayBuffer>): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    secret,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
}

async function indexFor(key: CryptoKey, label: string, locale: WordLocale): Promise<number> {
  const data = new TextEncoder().encode(`passphrasi|v${WORD_LIST_VERSION}|${label}`);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, data));
  const n = new DataView(mac.buffer).getUint32(0, false);
  return n % wordCount(locale);
}

export interface WindowWords {
  A: string;
  B: string;
}

export async function wordsForWindow(
  key: CryptoKey,
  window: number,
  locale: WordLocale = "en"
): Promise<WindowWords> {
  const a = await indexFor(key, `A|${window}`, locale);
  let b = await indexFor(key, `B|${window}`, locale);
  // Two identical words would read as "say the same word back", which an
  // impostor can do — never show the same word on both lines.
  if (b === a) b = (b + 1) % wordCount(locale);
  return { A: wordAt(a, locale), B: wordAt(b, locale) };
}

export function otherRole(role: PairRole): PairRole {
  return role === "A" ? "B" : "A";
}

/**
 * One fixed word both phones show right after pairing, so the person setting
 * it up can see the two phones really hold the same key before saving.
 */
export async function pairingCheckWord(key: CryptoKey, locale: WordLocale = "en"): Promise<string> {
  return wordAt(await indexFor(key, "pairing-check", locale), locale);
}

// ── QR payload ───────────────────────────────────────────────────────────────
// Deliberately NOT a URL: a phone's own camera app that scans it shows text and
// opens nothing, so the secret can't end up in a browser history or a chat.

function toBase64Url(bytes: Uint8Array): string {
  let bin = "";
  bytes.forEach((b: number) => {
    bin += String.fromCharCode(b);
  });
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(s: string): Uint8Array<ArrayBuffer> {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64 + "===".slice((b64.length + 3) % 4));
  return Uint8Array.from(bin, (c: string) => c.charCodeAt(0));
}

export function encodePairingQr(secret: Uint8Array<ArrayBuffer>, ownerName: string): string {
  return `${QR_PREFIX}:${toBase64Url(secret)}:${encodeURIComponent(ownerName.slice(0, 40))}`;
}

export interface ScannedPairing {
  secret: Uint8Array<ArrayBuffer>;
  /** The first name of whoever showed the code, to pre-fill step 2. */
  name: string;
}

export function decodePairingQr(text: string): ScannedPairing | null {
  const parts = text.trim().split(":");
  if (parts.length !== 3 || parts[0] !== QR_PREFIX) return null;
  try {
    const secret = fromBase64Url(parts[1]);
    if (secret.length !== SECRET_BYTES) return null;
    return { secret, name: decodeURIComponent(parts[2]) };
  } catch {
    return null;
  }
}
