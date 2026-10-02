"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

// Chrome/Android fires this before showing its own install prompt; we keep it
// so the setup person can trigger it from a button. Not in the TS DOM lib.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e: Event) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    listeners.forEach((l: () => void) => l());
  });
}

export function isInstalled(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIos(): boolean {
  return /iPhone|iPad|iPod/.test(navigator.userAgent);
}

export function InstallHelp() {
  const [, force] = useState(0);
  // False while server-rendering, true in the browser — without a re-render loop.
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);

  useEffect(() => {
    const l = () => force((n: number) => n + 1);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);

  if (!mounted) return null;

  if (isInstalled()) {
    return <p className="pps-small">Passphra.si is on this phone&rsquo;s home screen. It works without signal.</p>;
  }

  if (deferredPrompt) {
    return (
      <>
        <p className="pps-small">Put Passphra.si on the home screen so it&rsquo;s easy to find and works without signal.</p>
        <button
          type="button"
          className="pps-btn pps-btn-outline"
          onClick={async () => {
            const p = deferredPrompt;
            if (!p) return;
            await p.prompt();
            await p.userChoice;
            deferredPrompt = null;
            force((n: number) => n + 1);
          }}
        >
          Add to home screen
        </button>
      </>
    );
  }

  return (
    <p className="pps-small">
      {isIos() ? (
        <>
          Put Passphra.si on the home screen: in Safari, tap the <strong>Share</strong> button, then{" "}
          <strong>Add to Home Screen</strong>. It then works without signal.
        </>
      ) : (
        <>
          Put Passphra.si on the home screen: open the browser menu and choose{" "}
          <strong>Add to Home screen</strong> or <strong>Install app</strong>. It then works without
          signal.
        </>
      )}
    </p>
  );
}
