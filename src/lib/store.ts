// LocalStorage persistence for the MVP. Everything stays on-device.
import { randomHex, hashPassphrase } from "./crypto";

export interface Profile {
  id: string;
  name: string;
  createdAt: number;
}

export interface Passport {
  id: string;
  /** Name of the other person */
  name: string;
  /** The phrase lives here for the MINTING side (owner), so they can re-copy the link. */
  phrase: string;
  /** Salted hash of the phrase — what the CLAIMING side stores after reveal. */
  phraseHash: string;
  salt: string;
  createdAt: number;
}

const PROFILE_KEY = "passphrasi.profile";
const PASSPORTS_KEY = "passphrasi.passports";

export function loadProfile(): Profile | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    return raw ? (JSON.parse(raw) as Profile) : null;
  } catch {
    return null;
  }
}

export function saveProfile(name: string): Profile {
  const profile: Profile = {
    id: randomHex(8),
    name: name.trim(),
    createdAt: Date.now(),
  };
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  return profile;
}

export function clearProfile() {
  localStorage.removeItem(PROFILE_KEY);
}

export function loadPassports(): Passport[] {
  try {
    const raw = localStorage.getItem(PASSPORTS_KEY);
    return raw ? (JSON.parse(raw) as Passport[]) : [];
  } catch {
    return [];
  }
}

export function savePassports(passports: Passport[]) {
  localStorage.setItem(PASSPORTS_KEY, JSON.stringify(passports));
}

/** Create a passport and store it with a salted hash of the phrase (never the raw phrase on disk). */
export async function addPassport(name: string, phrase: string): Promise<Passport> {
  const salt = randomHex(8);
  const phraseHash = await hashPassphrase(phrase, salt);
  const passport: Passport = {
    id: randomHex(8),
    name: name.trim(),
    phrase,
    phraseHash,
    salt,
    createdAt: Date.now(),
  };
  const all = loadPassports();
  all.unshift(passport);
  savePassports(all);
  return passport;
}

export function updatePassport(passport: Passport) {
  const all = loadPassports().map((p) => (p.id === passport.id ? passport : p));
  savePassports(all);
}

export function getPassport(id: string): Passport | null {
  return loadPassports().find((p) => p.id === id) ?? null;
}

export function removePassport(id: string) {
  savePassports(loadPassports().filter((p) => p.id !== id));
}