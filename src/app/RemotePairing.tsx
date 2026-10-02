"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import {
  ACCEPTER_ROLE,
  INVITER_ROLE,
  deriveLinkKey,
  newLinkKeys,
  pairingLinkUrl,
  parsePairingLink,
  type PairingLink,
} from "@/lib/passphrasi/remote-pairing";
import {
  getInvite,
  newId,
  removeInvite,
  saveInvite,
  type LinkInvite,
  type Person,
} from "@/lib/passphrasi/store";
import type { PairRole } from "@/lib/passphrasi/words-engine";
import { LinkIcon, LockIcon, ShareIcon } from "./Icons";
import { DetailsStep, PairedScreen } from "./PairingFlow";
import { BackButton, type Nav } from "./shared";

type SentInvite = Extract<LinkInvite, { kind: "sent" }>;

const noopSubscribe = () => () => {};

function inviteLinkFor(invite: SentInvite, ownerName: string): string {
  return pairingLinkUrl({ kind: "invite", id: invite.id, name: ownerName, publicKey: invite.publicKey });
}

// ── Small pieces ─────────────────────────────────────────────────────────────

interface LinkBoxProps {
  link: string;
  /** Text that goes with the link in the share sheet / message. */
  message: string;
}

/** The link plus Share (the phone's own share sheet) and Copy. */
export function LinkBox({ link, message }: LinkBoxProps) {
  const [copied, setCopied] = useState(false);
  const canShare = useSyncExternalStore(
    noopSubscribe,
    () => typeof navigator.share === "function",
    () => false
  );

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${message} ${link}`);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="pps-linkbox">
      <p className="pps-linkbox-url">{link}</p>
      <div className="pps-linkbox-actions">
        {canShare && (
          <button
            type="button"
            className="pps-btn pps-btn-primary"
            onClick={() => navigator.share({ text: message, url: link }).catch(() => undefined)}
          >
            <ShareIcon size={22} />
            Send the link
          </button>
        )}
        <button
          type="button"
          className={`pps-btn ${canShare ? "pps-btn-outline" : "pps-btn-primary"}`}
          onClick={copy}
        >
          {copied ? "Copied" : "Copy the link"}
        </button>
      </div>
    </div>
  );
}

interface PasteLinkProps {
  label: string;
  /** Which kind of link this box expects, for the error message. */
  expect: PairingLink["kind"];
  onLink: (link: PairingLink) => void;
}

export function PasteLink({ label, expect, onLink }: PasteLinkProps) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const open = () => {
    const link = parsePairingLink(text);
    if (!link) {
      setError("That isn't a Passphra.si link. Ask them to send it again.");
      return;
    }
    if (link.kind !== expect) {
      setError(
        expect === "reply"
          ? "That's an invite, not a reply. Paste the link they sent back to you."
          : "That's a reply, not an invite. Paste the link they sent to start."
      );
      return;
    }
    onLink(link);
  };

  return (
    <div className="pps-field">
      <span className="pps-label">{label}</span>
      <div className="pps-paste">
        <input
          className="pps-input"
          value={text}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            setText(e.target.value);
            setError(null);
          }}
          onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === "Enter" && open()}
          placeholder="Paste the link here"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
        />
        <button
          type="button"
          className="pps-btn pps-btn-outline pps-btn-inline"
          disabled={!text.trim()}
          onClick={open}
        >
          Open
        </button>
      </div>
      {error && <p className="pps-small pps-warn">{error}</p>}
    </div>
  );
}

const LINK_NOTE =
  "The link holds no secret, so any chat app is fine. Your words are worked out on each phone and never sent.";

// ── Start: send an invite, or paste one ─────────────────────────────────────

interface LinkStartScreenProps {
  ownerName: string;
  existing: Person | null;
  nav: Nav;
  onChanged: () => Promise<void>;
}

export function LinkStartScreen({ ownerName, existing, nav, onChanged }: LinkStartScreenProps) {
  const [name, setName] = useState(existing?.name ?? "");
  const [invite, setInvite] = useState<SentInvite | null>(null);
  const [creating, setCreating] = useState(false);

  const create = async () => {
    if (!name.trim() || creating) return;
    setCreating(true);
    const keys = await newLinkKeys();
    const sent: SentInvite = {
      id: newId(),
      kind: "sent",
      name: name.trim(),
      repairId: existing?.id ?? null,
      privateKey: keys.privateKey,
      publicKey: keys.publicKey,
      createdAt: Date.now(),
    };
    await saveInvite(sent);
    await onChanged();
    setInvite(sent);
    setCreating(false);
  };

  if (invite) {
    return (
      <div className="pps-screen">
        <p className="pps-caps">Step 1 of 2</p>
        <h1 className="pps-headline">Send this link to {invite.name}</h1>
        <LinkBox
          link={inviteLinkFor(invite, ownerName)}
          message={`${ownerName} wants to set up Passphra.si with you, so we can check it's really us on calls. Open this:`}
        />
        <ol className="pps-card pps-steps">
          <li>
            <span className="pps-step-n">1</span>
            <span>{invite.name} opens it and taps Accept.</span>
          </li>
          <li>
            <span className="pps-step-n">2</span>
            <span>They send you a link back. Open it on this phone to finish.</span>
          </li>
        </ol>
        <p className="pps-note">
          <LockIcon size={22} />
          <span>{LINK_NOTE}</span>
        </p>
        <div className="pps-actions">
          <button type="button" className="pps-btn pps-btn-primary" onClick={nav.home}>
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pps-screen">
      <div className="pps-topbar">
        <BackButton onClick={nav.back} />
      </div>
      <h1 className="pps-headline">Not in the same room?</h1>
      <p className="pps-body">
        Send them a link instead. In person is still best: use a link when that isn&rsquo;t
        possible.
      </p>

      <label className="pps-field">
        <span className="pps-label">Who are you adding? First name</span>
        <input
          className="pps-input"
          value={name}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
          onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === "Enter" && create()}
          autoComplete="off"
          autoCapitalize="words"
          maxLength={40}
          placeholder="Lior"
        />
      </label>
      <button
        type="button"
        className="pps-btn pps-btn-primary"
        disabled={!name.trim() || creating}
        onClick={create}
      >
        <LinkIcon size={22} />
        Make a link for them
      </button>

      <hr className="pps-divider" />

      <PasteLink
        label="Did someone send you a link? Paste it"
        expect="invite"
        onLink={(link: PairingLink) => nav.replace({ name: "link", link })}
      />
    </div>
  );
}

// ── Pending invites, shown on Home ──────────────────────────────────────────

interface PendingInvitesProps {
  invites: LinkInvite[];
  ownerName: string;
  nav: Nav;
  onChanged: () => Promise<void>;
}

export function PendingInvites({ invites, ownerName, nav, onChanged }: PendingInvitesProps) {
  const [openId, setOpenId] = useState<string | null>(null);
  const sent = invites.filter((i: LinkInvite): i is SentInvite => i.kind === "sent");
  if (sent.length === 0) return null;

  return (
    <section className="pps-pending" aria-label="Waiting for a reply">
      {sent.map((inv: SentInvite) => (
        <div key={inv.id} className="pps-card pps-pending-card">
          <p className="pps-body">
            Waiting for <strong>{inv.name}</strong> to send their link back
          </p>
          {openId === inv.id ? (
            <>
              <PasteLink
                label={`Paste the link ${inv.name} sent back`}
                expect="reply"
                onLink={(link: PairingLink) => nav.push({ name: "link", link })}
              />
              <p className="pps-small">Or send your link again:</p>
              <LinkBox
                link={inviteLinkFor(inv, ownerName)}
                message={`${ownerName} wants to set up Passphra.si with you. Open this:`}
              />
              <button
                type="button"
                className="pps-link pps-link-quiet"
                onClick={async () => {
                  await removeInvite(inv.id);
                  await onChanged();
                }}
              >
                Cancel this invite
              </button>
            </>
          ) : (
            <button type="button" className="pps-link" onClick={() => setOpenId(inv.id)}>
              They replied? Paste their link
            </button>
          )}
        </div>
      ))}
    </section>
  );
}

// ── An opened invite or reply link ──────────────────────────────────────────

type Stage =
  | { step: "loading" }
  | { step: "accept" }
  | { step: "ownInvite"; name: string }
  | { step: "sendReply"; replyLink: string; next: { key: CryptoKey } | null }
  | { step: "details"; key: CryptoKey; role: PairRole; existing: Person | null }
  | { step: "notHere" }
  | { step: "done"; name: string };

interface LinkScreenProps {
  link: PairingLink;
  ownerName: string;
  people: Person[];
  nav: Nav;
  onChanged: () => Promise<void>;
}

export function LinkScreen({ link, ownerName, people, nav, onChanged }: LinkScreenProps) {
  const [stage, setStage] = useState<Stage>({ step: "loading" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const mine = await getInvite(link.id);
      let next: Stage;
      if (link.kind === "invite") {
        if (mine?.kind === "sent") next = { step: "ownInvite", name: mine.name };
        // Accepted before: show the same reply again rather than make a new key.
        else if (mine?.kind === "replied") next = { step: "sendReply", replyLink: mine.replyLink, next: null };
        else next = { step: "accept" };
      } else if (mine?.kind === "sent") {
        const key = await deriveLinkKey(mine.privateKey, link.publicKey, link.id);
        const existing = mine.repairId ? people.find((p: Person) => p.id === mine.repairId) ?? null : null;
        next = { step: "details", key, role: INVITER_ROLE, existing };
      } else {
        next = { step: "notHere" };
      }
      if (!cancelled) setStage(next);
    })();
    return () => {
      cancelled = true;
    };
    // `people` only seeds a re-pair on first load; reloading it must not restart the flow.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [link]);

  const accept = async () => {
    setBusy(true);
    const keys = await newLinkKeys();
    const key = await deriveLinkKey(keys.privateKey, link.publicKey, link.id);
    const replyLink = pairingLinkUrl({
      kind: "reply",
      id: link.id,
      name: ownerName,
      publicKey: keys.publicKey,
    });
    await saveInvite({ id: link.id, kind: "replied", name: link.name, replyLink, createdAt: Date.now() });
    setStage({ step: "sendReply", replyLink, next: { key } });
    setBusy(false);
  };

  switch (stage.step) {
    case "loading":
      return <div className="pps-screen" aria-busy="true" />;

    case "accept":
      return (
        <div className="pps-screen">
          <div className="pps-topbar">
            <BackButton onClick={nav.home} label="Not now" />
          </div>
          <h1 className="pps-headline">{link.name} wants to add you</h1>
          <p className="pps-body">
            You&rsquo;ll both get two words that change every minute. When {link.name} calls asking
            for money or a code, you check the words. A copied voice can&rsquo;t know them.
          </p>
          <p className="pps-note">
            <LockIcon size={22} />
            <span>{LINK_NOTE}</span>
          </p>
          <p className="pps-small">Not expecting this from {link.name}? Tap Not now.</p>
          <div className="pps-actions">
            <button type="button" className="pps-btn pps-btn-primary" disabled={busy} onClick={accept}>
              Accept
            </button>
          </div>
        </div>
      );

    case "ownInvite":
      return (
        <div className="pps-screen">
          <h1 className="pps-headline">This is your own link</h1>
          <p className="pps-body">
            Send it to {stage.name}. When they accept, they&rsquo;ll send you a link back to open
            here.
          </p>
          <div className="pps-actions">
            <button type="button" className="pps-btn pps-btn-primary" onClick={nav.home}>
              Done
            </button>
          </div>
        </div>
      );

    case "sendReply":
      return (
        <div className="pps-screen">
          <p className="pps-caps">Step 1 of 2</p>
          <h1 className="pps-headline">Send this link back to {link.name}</h1>
          <p className="pps-body">{link.name} needs it to finish. Send it the way you got theirs.</p>
          <LinkBox
            link={stage.replyLink}
            message={`Here's my Passphra.si link back. Open it to finish:`}
          />
          <p className="pps-note">
            <LockIcon size={22} />
            <span>{LINK_NOTE}</span>
          </p>
          <div className="pps-actions">
            {stage.next ? (
              <button
                type="button"
                className="pps-btn pps-btn-primary"
                onClick={() =>
                  stage.next &&
                  setStage({ step: "details", key: stage.next.key, role: ACCEPTER_ROLE, existing: null })
                }
              >
                I&rsquo;ve sent it
              </button>
            ) : (
              <button type="button" className="pps-btn pps-btn-primary" onClick={nav.home}>
                Done
              </button>
            )}
          </div>
        </div>
      );

    case "details":
      return (
        <DetailsStep
          existing={stage.existing}
          people={people}
          cryptoKey={stage.key}
          role={stage.role}
          scannedName={link.name}
          viaLink
          onBack={nav.home}
          onSaved={async (name: string) => {
            // The inviter's private key has done its job once the pair is saved.
            if (stage.role === INVITER_ROLE) await removeInvite(link.id);
            await onChanged();
            setStage({ step: "done", name });
          }}
        />
      );

    case "notHere":
      return (
        <div className="pps-screen">
          <h1 className="pps-headline">Open this in Passphra.si</h1>
          <p className="pps-body">
            This is {link.name}&rsquo;s link back to you, but this browser doesn&rsquo;t have the
            invite you sent. If you installed Passphra.si on your home screen, open it from there.
            Then paste this link where it says &ldquo;Waiting for {link.name}&rdquo;.
          </p>
          <div className="pps-actions">
            <button
              type="button"
              className="pps-btn pps-btn-primary"
              onClick={async () => {
                await navigator.clipboard
                  .writeText(pairingLinkUrl(link))
                  .catch(() => undefined);
                nav.home();
              }}
            >
              Copy the link and close
            </button>
          </div>
        </div>
      );

    case "done":
      return <PairedScreen name={stage.name} nav={nav} />;
  }
}
