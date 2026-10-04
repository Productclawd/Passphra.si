"use client";

import { useState } from "react";
import { isIos, safariUrl } from "@/lib/passphrasi/in-app-browser";
import { ExclamationIcon, ShieldIcon } from "./Icons";
import { SourceLink } from "./shared";

interface OpenInBrowserScreenProps {
  /** The full address this was opened with, pairing link (#fragment) included. */
  url: string;
  /** The app whose built-in browser this is, when we can tell. */
  app: string | null;
  /** True when we saw this browser fail to keep a key, not just guessed. */
  storageFailed: boolean;
  /** Only offered when we're guessing, so a wrong guess can't lock anyone out. */
  onContinue?: () => void;
}

export function OpenInBrowserScreen({ url, app, storageFailed, onContinue }: OpenInBrowserScreenProps) {
  const [copied, setCopied] = useState(false);
  const ios = isIos();
  const browser = ios ? "Safari" : "your browser";
  const where = app ? `inside ${app}` : "inside another app";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="pps-screen">
      <header className="pps-brand">
        <ShieldIcon size={26} />
        <span>Passphra.si</span>
      </header>
      <h1 className="pps-headline">Open this in {browser}</h1>
      <p className="pps-body">
        {storageFailed
          ? `This browser can't safely keep your family's words, so Passphra.si can't work here.`
          : `You opened this ${where}. Its built-in browser keeps things separately from ${browser}, so anything you set up here would be lost.`}
      </p>

      <div className="pps-actions">
        {ios && (
          <a className="pps-btn pps-btn-primary" href={safariUrl(url)}>
            Open in Safari
          </a>
        )}
        <button
          type="button"
          className={`pps-btn ${ios ? "pps-btn-outline" : "pps-btn-primary"}`}
          onClick={copy}
        >
          {copied ? `Copied — now paste it into ${browser}` : "Copy the link"}
        </button>
      </div>

      <p className="pps-note">
        <ExclamationIcon size={22} />
        <span>
          {ios ? (
            <>
              If the button doesn&rsquo;t work, tap the <strong>•••</strong> or <strong>Share</strong> button
              on this screen and choose <strong>Open in Safari</strong>. Or copy the link and paste it into
              Safari.
            </>
          ) : (
            <>
              Tap the <strong>⋮</strong> menu on this screen and choose <strong>Open in browser</strong>.
              Or copy the link and paste it into Chrome.
            </>
          )}
        </span>
      </p>

      {onContinue && (
        <button type="button" className="pps-link pps-link-quiet" onClick={onContinue}>
          Continue here anyway
        </button>
      )}
      <SourceLink />
    </div>
  );
}
