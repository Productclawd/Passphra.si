"use client";

import { useEffect, useState } from "react";
import { loadProfile, saveProfile, addPassport } from "@/lib/store";

function parsePayload(fragment: string) {
  try {
    const b64 = fragment.replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(b64);
    const obj = JSON.parse(json);
    if (obj && typeof obj.a === "string" && typeof obj.p === "string") {
      return obj as { a: string; b?: string; p: string };
    }
  } catch {
    /* ignore */
  }
  return null;
}

export default function ClaimPage() {
  const [payload, setPayload] = useState<{ a: string; b?: string; p: string } | null>(null);
  const [profile, setProfile] = useState<{ id: string; name: string; createdAt: number } | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [saved, setSaved] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!hydrated && typeof window !== "undefined") {
      setProfile(loadProfile());
      const raw = window.location.hash.slice(1);
      const parsed = parsePayload(raw);
      setPayload(parsed);
      // clear the secret from the address bar immediately — don't leave it lying around
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
      setHydrated(true);
    }
  }, [hydrated]);

  if (!hydrated) return null;

  if (!payload) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6">
        <div className="max-w-md w-full text-center">
          <div className="text-5xl mb-4">🕵️</div>
          <h1 className="text-2xl font-bold mb-2">No secret found</h1>
          <p className="text-gray-400 leading-relaxed">
            This link should contain your secret passphrase. Ask the person who
            sent it to re-copy the link from their minted passport.
          </p>
        </div>
      </main>
    );
  }

  async function saveSecret() {
    const p = profile ?? saveProfile(nameInput);
    setProfile(p);
    if (!payload) return;
    const passport = await addPassport(payload.a, payload.p);
    void passport;
    setSaved(true);
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="max-w-md w-full">
        <div className="rounded-2xl border border-green-500/40 bg-green-500/10 p-6">
          <h1 className="text-xl font-bold mb-1">
            {payload.a} sent you a passport 🛂
          </h1>
          <p className="text-sm text-gray-400 mb-5">
            {payload.b
              ? `A passport for your conversations with ${payload.a}. `
              : ""}
            This is your secret key. It is shown <span className="text-green-400 font-medium">once</span>.
          </p>

          {!profile && !saved && (
            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-2">First — your name</label>
              <input
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="e.g. Dana"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-green-500/50 outline-none"
              />
            </div>
          )}

          {!revealed ? (
            <button
              onClick={() => setRevealed(true)}
              className="w-full py-3 rounded-xl bg-green-500 text-black font-semibold hover:bg-green-400 transition"
            >
              Reveal my secret
            </button>
          ) : !saved ? (
            <>
              <div className="text-center py-4 rounded-xl bg-black/40 font-mono text-xl tracking-widest select-all mb-4">
                {payload.p}
              </div>
              <button
                onClick={saveSecret}
                disabled={!profile && !nameInput.trim()}
                className="w-full py-3 rounded-xl bg-green-500 text-black font-semibold hover:bg-green-400 disabled:opacity-40 transition"
              >
                I&apos;ve memorized it — save my passport
              </button>
            </>
          ) : (
            <div className="text-center">
              <div className="text-3xl mb-2">✅</div>
              <p className="text-green-400 font-medium mb-4">
                Passport saved. Use the phrase on every call with {payload.a}.
              </p>
              <a
                href="/"
                className="inline-block w-full py-3 rounded-xl bg-white/10 font-semibold hover:bg-white/20 transition"
              >
                Go to my app
              </a>
            </div>
          )}

          <p className="text-xs text-gray-500 mt-4 text-center">
            The link has been scrubbed from your address bar. The phrase is now
            only in your memory.
          </p>
        </div>
      </div>
    </main>
  );
}