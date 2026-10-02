/**
 * Pairing by link, for family who aren't in the same room.
 *
 * Two links, one each way, and neither carries the secret:
 *
 *   invite  (A → B): A's first name + A's ECDH public key
 *   reply   (B → A): B's first name + B's ECDH public key
 *
 * Each phone combines its own private key with the other's public key
 * (ECDH P-256) and runs the result through HKDF into the same HMAC key the
 * QR flow produces, so from then on the rotating words work identically.
 * Anyone who sees a link (a chat backup, a link-preview bot) learns nothing.
 *
 * What a link can't stop is someone swapping BOTH links in transit. The
 * pairing check word catches that: each phone would end up with a different
 * key, so the two check words wouldn't match when compared.
 *
 * Private keys are generated non-extractable and kept in IndexedDB while an
 * invite waits for its reply; the derived word key is non-extractable too.
 */
import { BASE_PATH } from "../base-path";
import { type PairRole } from "./words-engine";

const LINK_PARAM = "pair";
const ECDH = { name: "ECDH", namedCurve: "P-256" } as const;

export type LinkKind = "invite" | "reply";

export interface PairingLink {
  kind: LinkKind;
  /** Invite id — the reply echoes it so the inviter finds the right private key. */
  id: string;
  /** Sender's first name */
  name: string;
  /** Sender's public key, base64url raw P-256 */
  publicKey: string;
}

/** The role each side plays in the word engine: the inviter is A, whoever accepts is B. */
export const INVITER_ROLE: PairRole = "A";
export const ACCEPTER_ROLE: PairRole = "B";

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

export interface LinkKeys {
  privateKey: CryptoKey;
  publicKey: string;
}

export async function newLinkKeys(): Promise<LinkKeys> {
  // extractable=false applies to the private key; a public key is always exportable.
  const pair = (await crypto.subtle.generateKey(ECDH, false, ["deriveBits"])) as CryptoKeyPair;
  const raw = new Uint8Array(await crypto.subtle.exportKey("raw", pair.publicKey));
  return { privateKey: pair.privateKey, publicKey: toBase64Url(raw) };
}

/** Both sides call this and get the same non-extractable word key. */
export async function deriveLinkKey(
  privateKey: CryptoKey,
  theirPublicKey: string,
  inviteId: string
): Promise<CryptoKey> {
  const theirs = await crypto.subtle.importKey(
    "raw",
    fromBase64Url(theirPublicKey),
    ECDH,
    false,
    []
  );
  const shared = new Uint8Array(
    await crypto.subtle.deriveBits({ name: "ECDH", public: theirs }, privateKey, 256)
  );
  const base = await crypto.subtle.importKey("raw", shared, "HKDF", false, ["deriveKey"]);
  shared.fill(0);
  return crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: new TextEncoder().encode(`passphrasi|invite|${inviteId}`),
      info: new TextEncoder().encode("passphrasi|link-pairing|v1"),
    },
    base,
    { name: "HMAC", hash: "SHA-256", length: 256 },
    false,
    ["sign"]
  );
}

// ── Links ────────────────────────────────────────────────────────────────────
// The payload rides in the #fragment, which browsers never send to a server.

export function pairingLinkUrl(link: PairingLink): string {
  const payload = JSON.stringify({
    v: 1,
    t: link.kind === "invite" ? "i" : "r",
    id: link.id,
    n: link.name.slice(0, 40),
    k: link.publicKey,
  });
  const encoded = toBase64Url(new TextEncoder().encode(payload));
  return `${window.location.origin}${BASE_PATH}/#${LINK_PARAM}=${encoded}`;
}

/** Accepts a whole link (pasted) or a bare location.hash. Null for anything else. */
export function parsePairingLink(text: string): PairingLink | null {
  const match = text.trim().match(new RegExp(`#${LINK_PARAM}=([A-Za-z0-9_-]+)`));
  if (!match) return null;
  try {
    const obj: unknown = JSON.parse(new TextDecoder().decode(fromBase64Url(match[1])));
    if (typeof obj !== "object" || obj === null) return null;
    const o = obj as Record<string, unknown>;
    if (
      o.v !== 1 ||
      (o.t !== "i" && o.t !== "r") ||
      typeof o.id !== "string" ||
      typeof o.n !== "string" ||
      typeof o.k !== "string" ||
      fromBase64Url(o.k).length !== 65
    ) {
      return null;
    }
    return { kind: o.t === "i" ? "invite" : "reply", id: o.id, name: o.n.slice(0, 40), publicKey: o.k };
  } catch {
    return null;
  }
}
