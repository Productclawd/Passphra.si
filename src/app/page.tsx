"use client";

import { useMemo, useState } from "react";
import {
  Profile,
  Passport,
  loadProfile,
  saveProfile,
  clearProfile,
  loadPassports,
  addPassport,
  removePassport,
} from "@/lib/store";
import { generatePhrase, verifyPhrase } from "@/lib/crypto";

function b64url(obj: unknown) {
  return btoa(JSON.stringify(obj)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export default function Home() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [passports, setPassports] = useState<Passport[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // hydrate from localStorage on mount (client-only)
  useMemo(() => {
    if (typeof window !== "undefined" && !hydrated) {
      setProfile(loadProfile());
      setPassports(loadPassports());
      setHydrated(true);
    }
  }, [hydrated]);

  const [nameInput, setNameInput] = useState("");
  const [mintName, setMintName] = useState("");
  const [freshPassport, setFreshPassport] = useState<Passport | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [verifyInput, setVerifyInput] = useState<Record<string, string>>({});
  const [verifyResult, setVerifyResult] = useState<Record<string, boolean | null>>({});
  const [copied, setCopied] = useState(false);

  if (!hydrated) return null;

  if (!profile) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6">
        <div className="max-w-md w-full">
          <div className="text-5xl mb-4">🔐</div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            Passphra.si
          </h1>
          <p className="text-gray-400 mb-8 leading-relaxed">
            The person on the other end of the call might not be who they say
            they are. Deepfakes can clone a face and a voice in real time. Fix:
            a secret passphrase only the two of you share.
          </p>
          <label className="block text-sm text-gray-400 mb-2">Your name</label>
          <input
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && nameInput.trim() && createProfile()}
            placeholder="e.g. Dana"
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-green-500/50 outline-none mb-4"
          />
          <button
            onClick={createProfile}
            disabled={!nameInput.trim()}
            className="w-full py-3 rounded-xl bg-green-500 text-black font-semibold hover:bg-green-400 disabled:opacity-40 transition"
          >
            Create profile →
          </button>
        </div>
      </main>
    );
  }

  function createProfile() {
    const p = saveProfile(nameInput);
    setProfile(p);
  }

  async function mint() {
    if (!mintName.trim()) return;
    const phrase = generatePhrase(4);
    const p = await addPassport(mintName, phrase);
    setPassports(loadPassports());
    setFreshPassport(p);
    setMintName("");
    setRevealed(false);
    setCopied(false);
  }

  const shareLink = freshPassport
    ? `${location.origin}${location.pathname}claim#${b64url({
        a: profile.name,
        b: freshPassport.name,
        p: freshPassport.phrase,
      })}`
    : "";

  async function copyLink() {
    await navigator.clipboard.writeText(shareLink);
    setCopied(true);
  }

  async function checkMemory(id: string, phrase: string) {
    const p = passports.find((x) => x.id === id);
    if (!p || !phrase.trim()) return;
    const ok = await verifyPhrase(phrase, p.salt, p.phraseHash);
    setVerifyResult((r) => ({ ...r, [id]: ok }));
  }

  function signOut() {
    clearProfile();
    setProfile(null);
    setPassports([]);
  }

  return (
    <main className="min-h-screen px-6 py-10">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-2">
          <div className="text-2xl font-bold">
            🔐 Passphra.si
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-gray-400">{profile.name}</span>
            <button onClick={signOut} className="text-gray-500 hover:text-white transition">
              Sign out
            </button>
          </div>
        </div>
        <p className="text-gray-500 text-sm mb-8">
          Mint a passport for someone you talk to. Each one holds a secret
          passphrase — revealed once, kept in your head, used on every call.
        </p>

        {/* Mint */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 mb-8">
          <label className="block text-sm text-gray-400 mb-2">
            Who do you want a passport with?
          </label>
          <div className="flex gap-2">
            <input
              value={mintName}
              onChange={(e) => setMintName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && mint()}
              placeholder="e.g. Alex"
              className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-green-500/50 outline-none"
            />
            <button
              onClick={mint}
              disabled={!mintName.trim()}
              className="px-5 py-3 rounded-xl bg-green-500 text-black font-semibold hover:bg-green-400 disabled:opacity-40 transition"
            >
              Mint
            </button>
          </div>
        </div>

        {/* Fresh passport reveal — one-time */}
        {freshPassport && (
          <div className="rounded-2xl border border-green-500/40 bg-green-500/10 p-6 mb-8">
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-semibold">Passport minted with {freshPassport.name}</h2>
              <span className="text-xs text-green-400 px-2 py-1 rounded-full bg-green-500/20">
                shown once
              </span>
            </div>
            {!revealed ? (
              <>
                <p className="text-sm text-gray-400 mb-4">
                  Memorize your secret. Then send the link to {freshPassport.name}{" "}
                  — they&apos;ll see it once too. Keep both the phrase and the
                  link out of screenshots &amp; group chats.
                </p>
                <div className="text-center py-4 rounded-xl bg-black/40 font-mono text-xl tracking-widest select-all mb-4">
                  {freshPassport.phrase}
                </div>
                <button
                  onClick={() => setRevealed(true)}
                  className="w-full py-3 rounded-xl border border-green-500/50 text-green-400 font-semibold hover:bg-green-500/10 transition"
                >
                  I&apos;ve memorized it
                </button>
              </>
            ) : (
              <>
                <p className="text-sm text-gray-400 mb-4">
                  Send this link to {freshPassport.name} over a private channel
                  (DM, in person, encrypted chat). Whoever holds the link gets
                  the secret — deliver it like a key.
                </p>
                <div className="flex items-center gap-2 mb-4">
                  <input
                    readOnly
                    value={shareLink}
                    className="flex-1 px-3 py-2.5 rounded-lg bg-black/40 border border-white/10 font-mono text-xs text-green-300 outline-none"
                  />
                  <button
                    onClick={copyLink}
                    className="px-4 py-2.5 rounded-lg bg-green-500 text-black font-semibold hover:bg-green-400 transition"
                  >
                    {copied ? "Copied ✓" : "Copy"}
                  </button>
                </div>
                <button
                  onClick={() => setFreshPassport(null)}
                  className="w-full py-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 transition"
                >
                  Done
                </button>
              </>
            )}
          </div>
        )}

        {/* Passport list */}
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Your passports ({passports.length})
        </h3>
        {passports.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-gray-500 text-sm">
            No passports yet. Mint one above before your next call. 🫵
          </div>
        ) : (
          <div className="space-y-3">
            {passports.map((p) => (
              <div key={p.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium">🛂 {p.name}</span>
                  <button
                    onClick={() => {
                      removePassport(p.id);
                      setPassports(loadPassports());
                    }}
                    className="text-xs text-gray-600 hover:text-red-400 transition"
                  >
                    remove
                  </button>
                </div>
                <div className="flex gap-2">
                  <input
                    value={verifyInput[p.id] ?? ""}
                    onChange={(e) =>
                      setVerifyInput((v) => ({ ...v, [p.id]: e.target.value }))
                    }
                    onKeyDown={(e) =>
                      e.key === "Enter" && checkMemory(p.id, verifyInput[p.id] ?? "")
                    }
                    placeholder="Test your memory before the call…"
                    className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm outline-none"
                  />
                  <button
                    onClick={() => checkMemory(p.id, verifyInput[p.id] ?? "")}
                    className="px-3 py-2 rounded-lg bg-white/10 text-sm hover:bg-white/20 transition"
                  >
                    Check
                  </button>
                </div>
                {verifyResult[p.id] !== undefined && (
                  <p
                    className={`text-sm mt-2 font-medium ${
                      verifyResult[p.id] ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    {verifyResult[p.id]
                      ? "✓ Correct — you're ready for the call."
                      : "✗ Not the phrase. Re-mint a new passport to be safe."}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        <p className="text-center text-xs text-gray-600 mt-10">
          On a call, either side can ask: &quot;what&apos;s our phrase?&quot; — if the
          answer isn&apos;t instant and right, hang up. Everything stays on your
          devices; nothing is stored on a server.
        </p>
      </div>
    </main>
  );
}