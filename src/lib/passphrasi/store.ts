/**
 * On-device storage for Passphra.si — IndexedDB only. There is no backend,
 * no account and no sync: lose the phone and you re-pair.
 *
 * Each person's key is stored as a non-extractable CryptoKey (IndexedDB can
 * hold one directly), never as a phrase or raw bytes. So is the private half
 * of a link invite while it waits for the reply.
 */
import type { PairRole } from "./words-engine";

export interface Person {
  id: string;
  name: string;
  relationship: string;
  /** Number to call back on when the words don't match. Optional. */
  phone: string;
  /** Small square JPEG data URL for the monogram circle. Optional. */
  photo: string | null;
  role: PairRole;
  key: CryptoKey;
  pairedAt: number;
}

/**
 * A link pairing in progress. "sent": we invited someone and hold our private
 * key until their reply arrives. "replied": we accepted someone's invite —
 * kept so the reply link can be sent again if it got lost.
 */
export type LinkInvite =
  | {
      id: string;
      kind: "sent";
      /** First name of the person we invited */
      name: string;
      /** Set when this invite re-pairs someone already on the list. */
      repairId: string | null;
      privateKey: CryptoKey;
      publicKey: string;
      createdAt: number;
    }
  | {
      id: string;
      kind: "replied";
      /** First name of the person who invited us */
      name: string;
      replyLink: string;
      createdAt: number;
    };

export interface Settings {
  ownerName: string;
}

const DB_NAME = "passphrasi";
const DB_VERSION = 2;
const PEOPLE = "people";
const INVITES = "invites";
const SETTINGS = "settings";
const SETTINGS_KEY = "settings";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(PEOPLE)) db.createObjectStore(PEOPLE, { keyPath: "id" });
      if (!db.objectStoreNames.contains(SETTINGS)) db.createObjectStore(SETTINGS);
      if (!db.objectStoreNames.contains(INVITES)) db.createObjectStore(INVITES, { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function run<T>(
  storeName: string,
  mode: IDBTransactionMode,
  op: (store: IDBObjectStore) => IDBRequest
): Promise<T> {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const req = op(tx.objectStore(storeName));
    tx.oncomplete = () => {
      db.close();
      resolve(req.result as T);
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export async function listPeople(): Promise<Person[]> {
  const people = await run<Person[]>(PEOPLE, "readonly", (s: IDBObjectStore) => s.getAll());
  return people.sort((a: Person, b: Person) => a.pairedAt - b.pairedAt);
}

export function savePerson(person: Person): Promise<IDBValidKey> {
  return run<IDBValidKey>(PEOPLE, "readwrite", (s: IDBObjectStore) => s.put(person));
}

export function removePerson(id: string): Promise<undefined> {
  return run<undefined>(PEOPLE, "readwrite", (s: IDBObjectStore) => s.delete(id));
}

export async function listInvites(): Promise<LinkInvite[]> {
  const all = await run<LinkInvite[]>(INVITES, "readonly", (s: IDBObjectStore) => s.getAll());
  return all.sort((a: LinkInvite, b: LinkInvite) => a.createdAt - b.createdAt);
}

export async function getInvite(id: string): Promise<LinkInvite | null> {
  const v = await run<LinkInvite | undefined>(INVITES, "readonly", (s: IDBObjectStore) => s.get(id));
  return v ?? null;
}

export function saveInvite(invite: LinkInvite): Promise<IDBValidKey> {
  return run<IDBValidKey>(INVITES, "readwrite", (s: IDBObjectStore) => s.put(invite));
}

export function removeInvite(id: string): Promise<undefined> {
  return run<undefined>(INVITES, "readwrite", (s: IDBObjectStore) => s.delete(id));
}

export async function getSettings(): Promise<Settings | null> {
  const v = await run<Settings | undefined>(SETTINGS, "readonly", (s: IDBObjectStore) =>
    s.get(SETTINGS_KEY)
  );
  return v ?? null;
}

export function saveSettings(settings: Settings): Promise<IDBValidKey> {
  return run<IDBValidKey>(SETTINGS, "readwrite", (s: IDBObjectStore) =>
    s.put(settings, SETTINGS_KEY)
  );
}

/** Asks the browser not to clear our data under storage pressure. Best effort. */
export async function requestPersistence(): Promise<void> {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) {
      await navigator.storage.persist();
    }
  } catch {
    // Not supported — nothing to do.
  }
}

export function newId(): string {
  return crypto.randomUUID();
}
