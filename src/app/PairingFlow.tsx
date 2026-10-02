"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  decodePairingQr,
  encodePairingQr,
  importSecret,
  newSecret,
  pairingCheckWord,
  type PairRole,
} from "@/lib/passphrasi/words-engine";
import { newId, savePerson, type Person } from "@/lib/passphrasi/store";
import { CameraIcon, CheckIcon, LinkIcon, LockIcon, PrinterIcon } from "./Icons";
import { InstallHelp } from "./InstallHelp";
import { QrScanner } from "./QrScanner";
import { BackButton, Monogram, photoToDataUrl, RELATIONSHIPS, type Nav } from "./shared";

interface PairingFlowProps {
  ownerName: string;
  /** Set when re-pairing someone already on the list (new or lost phone). */
  existing: Person | null;
  nav: Nav;
  onSaved: () => Promise<void>;
}

type Stage =
  | { step: "show"; secret: Uint8Array<ArrayBuffer> }
  | { step: "scan" }
  | { step: "details"; key: CryptoKey; role: PairRole; scannedName: string }
  | { step: "done"; name: string };

export function PairingFlow({ ownerName, existing, nav, onSaved }: PairingFlowProps) {
  const [stage, setStage] = useState<Stage>(() => ({ step: "show", secret: newSecret() }));
  const [scanNote, setScanNote] = useState<string | null>(null);

  // Raw secret bytes exist only while the QR is on screen. Moving on turns them
  // into a key that can't be read back, and the bytes are dropped with the stage.
  const toDetails = async (secret: Uint8Array<ArrayBuffer>, role: PairRole, scannedName: string) => {
    const key = await importSecret(secret);
    secret.fill(0);
    setStage({ step: "details", key, role, scannedName });
  };

  if (stage.step === "show") {
    return (
      <div className="pps-screen">
        <div className="pps-topbar">
          <BackButton onClick={nav.back} />
        </div>
        <p className="pps-caps">Step 1 of 2</p>
        <h1 className="pps-headline">Scan this with Passphra.si on the other phone</h1>
        <div className="pps-card pps-qr">
          <QRCodeSVG
            value={encodePairingQr(stage.secret, ownerName)}
            size={240}
            level="M"
            bgColor="#FFFFFF"
            fgColor="#0F1B2D"
            marginSize={2}
            title="Pairing code"
          />
        </div>
        <p className="pps-note">
          <LockIcon size={22} />
          <span>
            Do this together, in person. The key stays on these two phones and never goes online.
          </span>
        </p>
        <div className="pps-card pps-confirm">
          <p className="pps-body">
            On the other phone, open Passphra.si, tap <strong>Add someone</strong>, then{" "}
            <strong>Scan their code instead</strong>.
          </p>
          <p className="pps-small">
            The phone&rsquo;s camera app can&rsquo;t read this code. That&rsquo;s on purpose: the key
            only goes into Passphra.si.
          </p>
        </div>
        <div className="pps-actions">
          <button
            type="button"
            className="pps-btn pps-btn-primary"
            onClick={() => toDetails(stage.secret, "A", "")}
          >
            Done. It was scanned
          </button>
          <button
            type="button"
            className="pps-btn pps-btn-outline"
            onClick={() => {
              stage.secret.fill(0);
              setStage({ step: "scan" });
            }}
          >
            <CameraIcon size={24} />
            Scan their code instead
          </button>
          <button
            type="button"
            className="pps-link pps-link-center pps-link-icon"
            onClick={() => {
              stage.secret.fill(0);
              nav.replace({ name: "linkStart", repairId: existing?.id });
            }}
          >
            <LinkIcon size={22} />
            Not in the same room? Use a link
          </button>
        </div>
      </div>
    );
  }

  if (stage.step === "scan") {
    return (
      <div className="pps-screen">
        <div className="pps-topbar">
          <BackButton onClick={() => setStage({ step: "show", secret: newSecret() })} />
        </div>
        <p className="pps-caps">Step 1 of 2</p>
        <h1 className="pps-headline">Point this phone at their code</h1>
        <QrScanner
          onResult={(text: string) => {
            const parsed = decodePairingQr(text);
            if (!parsed) {
              setScanNote("That isn't a Passphra.si code. Open Add someone on the other phone.");
              return false;
            }
            toDetails(parsed.secret, "B", parsed.name);
            return true;
          }}
        />
        {scanNote && <p className="pps-small pps-warn">{scanNote}</p>}
        <p className="pps-note">
          <LockIcon size={22} />
          <span>
            Do this together, in person. The key stays on these two phones and never goes online.
          </span>
        </p>
        <div className="pps-actions">
          <button
            type="button"
            className="pps-btn pps-btn-outline"
            onClick={() => setStage({ step: "show", secret: newSecret() })}
          >
            Show my code instead
          </button>
        </div>
      </div>
    );
  }

  if (stage.step === "details") {
    return (
      <DetailsStep
        existing={existing}
        cryptoKey={stage.key}
        role={stage.role}
        scannedName={stage.scannedName}
        onBack={() => setStage({ step: "show", secret: newSecret() })}
        onSaved={async (name: string) => {
          await onSaved();
          setStage({ step: "done", name });
        }}
      />
    );
  }

  return <PairedScreen name={stage.name} nav={nav} />;
}

export function PairedScreen({ name, nav }: { name: string; nav: Nav }) {
  return (
    <div className="pps-screen">
      <div className="pps-result-body">
        <span className="pps-result-mark pps-result-mark-navy">
          <CheckIcon size={56} strokeWidth={2.5} />
        </span>
        <h1 className="pps-headline">{name} is ready</h1>
        <p className="pps-body">
          Next time {name} calls and asks for money or a code, open this app and tap their name.
        </p>
      </div>
      <InstallHelp moment="paired" />
      <div className="pps-actions">
        <button type="button" className="pps-btn pps-btn-primary" onClick={nav.home}>
          Done
        </button>
        <button
          type="button"
          className="pps-btn pps-btn-outline"
          onClick={() => nav.replace({ name: "card" })}
        >
          <PrinterIcon size={24} />
          Print a fridge card
        </button>
      </div>
    </div>
  );
}

interface DetailsStepProps {
  existing: Person | null;
  cryptoKey: CryptoKey;
  role: PairRole;
  scannedName: string;
  /** Paired by link: the phones aren't side by side, so the check word is compared by talking. */
  viaLink?: boolean;
  onBack: () => void;
  onSaved: (name: string) => Promise<void>;
}

export function DetailsStep({
  existing,
  cryptoKey,
  role,
  scannedName,
  viaLink = false,
  onBack,
  onSaved,
}: DetailsStepProps) {
  const [name, setName] = useState(existing?.name ?? scannedName);
  const [relationship, setRelationship] = useState(existing?.relationship ?? "");
  const [phone, setPhone] = useState(existing?.phone ?? "");
  const [photo, setPhoto] = useState<string | null>(existing?.photo ?? null);
  const [checkWord, setCheckWord] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    pairingCheckWord(cryptoKey).then(setCheckWord);
  }, [cryptoKey]);

  const canSave = name.trim().length > 0 && !saving;

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      const trimmed = name.trim();
      await savePerson({
        id: existing?.id ?? newId(),
        name: trimmed,
        relationship: relationship.trim(),
        phone: phone.trim(),
        photo,
        role,
        key: cryptoKey,
        pairedAt: existing?.pairedAt ?? Date.now(),
      });
      await onSaved(trimmed);
    } catch {
      setError("Couldn't save on this phone. Please try again.");
      setSaving(false);
    }
  };

  return (
    <div className="pps-screen">
      <div className="pps-topbar">
        <BackButton onClick={onBack} />
      </div>
      <p className="pps-caps">Step 2 of 2</p>
      <h1 className="pps-headline">Who is on the other phone?</h1>

      {viaLink ? (
        <div className="pps-card pps-confirm">
          <p className="pps-small">Both phones now show one word. Ask them to read theirs out:</p>
          <p className="pps-word pps-word-sm">{checkWord ?? " "}</p>
          <p className="pps-small">
            Different words? Don&rsquo;t save. Someone may have changed the links. Pair in person
            instead.
          </p>
        </div>
      ) : (
        <div className="pps-card pps-confirm">
          <p className="pps-small">Both phones should now show the same word:</p>
          <p className="pps-word pps-word-sm">{checkWord ?? " "}</p>
          <p className="pps-small">Different words? Tap Back and scan again.</p>
        </div>
      )}

      <label className="pps-field">
        <span className="pps-label">Their first name</span>
        <input
          className="pps-input"
          value={name}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
          autoComplete="off"
          autoCapitalize="words"
          maxLength={40}
          placeholder="Lior"
        />
      </label>

      <div className="pps-field">
        <span className="pps-label">They are your…</span>
        <div className="pps-chips" role="group" aria-label="Relationship">
          {RELATIONSHIPS.map((r: string) => (
            <button
              key={r}
              type="button"
              className={`pps-chip ${relationship === r ? "pps-chip-on" : ""}`}
              aria-pressed={relationship === r}
              onClick={() => setRelationship(relationship === r ? "" : r)}
            >
              {r}
            </button>
          ))}
        </div>
        <input
          className="pps-input"
          value={RELATIONSHIPS.includes(relationship) ? "" : relationship}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRelationship(e.target.value)}
          placeholder="Or type it, e.g. Neighbour"
          maxLength={30}
        />
      </div>

      <label className="pps-field">
        <span className="pps-label">Their phone number (optional)</span>
        <span className="pps-hint">Used for the &ldquo;Call them back&rdquo; button.</span>
        <input
          className="pps-input"
          type="tel"
          inputMode="tel"
          value={phone}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPhone(e.target.value)}
          autoComplete="off"
          placeholder="+351 912 345 678"
        />
      </label>

      <div className="pps-field">
        <span className="pps-label">Photo (optional)</span>
        <div className="pps-photo-row">
          <Monogram name={name || "?"} photo={photo} size="lg" />
          <label className="pps-btn pps-btn-outline pps-btn-inline">
            {photo ? "Change photo" : "Add a photo"}
            <input
              type="file"
              accept="image/*"
              className="pps-visually-hidden"
              onChange={async (e: React.ChangeEvent<HTMLInputElement>) => {
                const file = e.target.files?.[0];
                if (file) setPhoto(await photoToDataUrl(file).catch(() => null));
              }}
            />
          </label>
          {photo && (
            <button type="button" className="pps-link" onClick={() => setPhoto(null)}>
              Remove
            </button>
          )}
        </div>
      </div>

      {error && <p className="pps-small pps-warn">{error}</p>}

      <div className="pps-actions">
        <button type="button" className="pps-btn pps-btn-primary" disabled={!canSave} onClick={save}>
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}
