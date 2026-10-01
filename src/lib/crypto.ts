// Crypto helpers — all client-side Web Crypto, no secrets leave the device.
import { WORDS } from "./words";

/** SHA-256 hex digest */
export async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Cryptographically secure random hex string */
export function randomHex(bytes = 16): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Readable passphrase: N random words from the EFF short wordlist (1296 words) */
export function generatePhrase(words = 4): string {
  const arr = new Uint32Array(words);
  crypto.getRandomValues(arr);
  return Array.from(arr)
    .map((n) => WORDS[n % WORDS.length])
    .join(" ");
}

/** Salted hash of a passphrase — what we store, never the phrase itself. */
export function hashPassphrase(phrase: string, salt: string): Promise<string> {
  return sha256(`${phrase.trim().toLowerCase()}::${salt}`);
}

/** Verify a typed phrase against a stored hash. */
export async function verifyPhrase(
  phrase: string,
  salt: string,
  expectedHash: string
): Promise<boolean> {
  const h = await hashPassphrase(phrase, salt);
  return h === expectedHash;
}