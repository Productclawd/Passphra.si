"use client";

import { useState } from "react";
import { removePerson, savePerson, saveSettings, type Person } from "@/lib/passphrasi/store";
import { ChevronRightIcon, PrinterIcon, ShieldIcon } from "./Icons";
import { BackButton, Monogram, photoToDataUrl, RELATIONSHIPS, type Nav } from "./shared";
import { InstallHelp } from "./InstallHelp";

/** A deliberate stop between Home and the setup area, so it isn't opened by accident. */
export function GateScreen({ nav }: { nav: Nav }) {
  return (
    <div className="pps-screen">
      <div className="pps-topbar">
        <BackButton onClick={nav.back} />
      </div>
      <h1 className="pps-headline">Settings</h1>
      <p className="pps-body">
        This part is for the person who set up this phone. Nothing here is needed to check a caller.
      </p>
      <div className="pps-actions">
        <button type="button" className="pps-btn pps-btn-outline" onClick={() => nav.replace({ name: "manage" })}>
          Open settings
        </button>
        <button type="button" className="pps-btn pps-btn-primary" onClick={nav.back}>
          Go back
        </button>
      </div>
    </div>
  );
}

interface ManageScreenProps {
  ownerName: string;
  people: Person[];
  nav: Nav;
  onChanged: () => Promise<void>;
}

export function ManageScreen({ ownerName, people, nav, onChanged }: ManageScreenProps) {
  const [name, setName] = useState(ownerName);
  const [savedNote, setSavedNote] = useState(false);

  const saveOwner = async () => {
    if (!name.trim()) return;
    await saveSettings({ ownerName: name.trim() });
    await onChanged();
    setSavedNote(true);
  };

  return (
    <div className="pps-screen">
      <div className="pps-topbar">
        <BackButton onClick={nav.back} />
      </div>
      <h1 className="pps-headline">Settings</h1>

      <h2 className="pps-subhead">People</h2>
      {people.length > 0 ? (
        <ul className="pps-card pps-list">
          {people.map((p: Person) => (
            <li key={p.id}>
              <button
                type="button"
                className="pps-row pps-row-compact"
                onClick={() => nav.push({ name: "editPerson", id: p.id })}
              >
                <Monogram name={p.name} photo={p.photo} />
                <span className="pps-row-text">
                  <span className="pps-row-name">{p.name}</span>
                  <span className="pps-row-rel">{p.relationship || "Edit details"}</span>
                </span>
                <ChevronRightIcon size={24} className="pps-row-chevron" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="pps-small">No one added yet.</p>
      )}
      <button type="button" className="pps-btn pps-btn-outline" onClick={() => nav.push({ name: "pair" })}>
        Add someone
      </button>

      <h2 className="pps-subhead">Fridge card</h2>
      <p className="pps-small">One page with the rule and the names, to keep by the phone.</p>
      <button type="button" className="pps-btn pps-btn-outline" onClick={() => nav.push({ name: "card" })}>
        <PrinterIcon size={24} />
        Print fridge card
      </button>

      <h2 className="pps-subhead">Whose phone is this?</h2>
      <label className="pps-field">
        <span className="pps-label">First name</span>
        <input
          className="pps-input"
          value={name}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            setName(e.target.value);
            setSavedNote(false);
          }}
          maxLength={40}
        />
      </label>
      <button
        type="button"
        className="pps-btn pps-btn-outline"
        disabled={!name.trim() || name.trim() === ownerName}
        onClick={saveOwner}
      >
        {savedNote ? "Saved" : "Save name"}
      </button>

      <h2 className="pps-subhead">Home screen</h2>
      <InstallHelp />

      <h2 className="pps-subhead">New or lost phone</h2>
      <p className="pps-small">
        Everything is kept only on this phone — there is no account and no backup. On a new phone,
        add each person again: open their name above and tap <strong>Pair again</strong>, with both
        phones together.
      </p>

      <p className="pps-footnote">
        <ShieldIcon size={18} />
        <span>
          Passphra.si helps you spot a fake caller. It can&rsquo;t stop every scam — if something
          feels wrong, hang up and call back on the number you know.
        </span>
      </p>
    </div>
  );
}

interface EditPersonScreenProps {
  person: Person;
  nav: Nav;
  onChanged: () => Promise<void>;
}

export function EditPersonScreen({ person, nav, onChanged }: EditPersonScreenProps) {
  const [name, setName] = useState(person.name);
  const [relationship, setRelationship] = useState(person.relationship);
  const [phone, setPhone] = useState(person.phone);
  const [photo, setPhoto] = useState<string | null>(person.photo);
  const [confirmRemove, setConfirmRemove] = useState(false);

  const save = async () => {
    if (!name.trim()) return;
    await savePerson({
      ...person,
      name: name.trim(),
      relationship: relationship.trim(),
      phone: phone.trim(),
      photo,
    });
    await onChanged();
    nav.back();
  };

  const remove = async () => {
    await removePerson(person.id);
    await onChanged();
    nav.back();
  };

  return (
    <div className="pps-screen">
      <div className="pps-topbar">
        <BackButton onClick={nav.back} />
      </div>
      <div className="pps-photo-row">
        <Monogram name={name || person.name} photo={photo} size="lg" />
        <h1 className="pps-headline pps-headline-inline">{person.name}</h1>
      </div>

      <label className="pps-field">
        <span className="pps-label">First name</span>
        <input
          className="pps-input"
          value={name}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
          maxLength={40}
        />
      </label>

      <label className="pps-field">
        <span className="pps-label">They are your…</span>
        <input
          className="pps-input"
          value={relationship}
          list="pps-relationships"
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRelationship(e.target.value)}
          maxLength={30}
        />
        <datalist id="pps-relationships">
          {RELATIONSHIPS.map((r: string) => (
            <option key={r} value={r} />
          ))}
        </datalist>
      </label>

      <label className="pps-field">
        <span className="pps-label">Call-back number</span>
        <input
          className="pps-input"
          type="tel"
          inputMode="tel"
          value={phone}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPhone(e.target.value)}
          placeholder="Optional"
        />
      </label>

      <div className="pps-field">
        <span className="pps-label">Photo</span>
        <div className="pps-photo-row">
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
              Remove photo
            </button>
          )}
        </div>
      </div>

      <button type="button" className="pps-btn pps-btn-primary" disabled={!name.trim()} onClick={save}>
        Save
      </button>

      <h2 className="pps-subhead">New or lost phone?</h2>
      <p className="pps-small">
        Pair again with both phones together. The old words stop working on this phone.
      </p>
      <button
        type="button"
        className="pps-btn pps-btn-outline"
        onClick={() => nav.push({ name: "pair", repairId: person.id })}
      >
        Pair again
      </button>

      <h2 className="pps-subhead">Remove</h2>
      {confirmRemove ? (
        <div className="pps-card pps-confirm-remove">
          <p className="pps-body">
            Remove {person.name} from this phone? You would need to pair again to check them.
          </p>
          <button type="button" className="pps-btn pps-btn-danger" onClick={remove}>
            Yes, remove {person.name}
          </button>
          <button type="button" className="pps-link pps-link-center" onClick={() => setConfirmRemove(false)}>
            Keep {person.name}
          </button>
        </div>
      ) : (
        <button type="button" className="pps-btn pps-btn-danger-outline" onClick={() => setConfirmRemove(true)}>
          Remove {person.name}
        </button>
      )}
    </div>
  );
}

interface FridgeCardScreenProps {
  people: Person[];
  nav: Nav;
}

export function FridgeCardScreen({ people, nav }: FridgeCardScreenProps) {
  return (
    <div className="pps-screen pps-card-screen">
      <div className="pps-topbar pps-no-print">
        <BackButton onClick={nav.back} />
      </div>
      <article className="pps-fridge">
        <p className="pps-fridge-brand">
          <ShieldIcon size={28} />
          <span>Passphra.si</span>
        </p>
        <h1 className="pps-fridge-rule">
          Asked for money or a code?
          <br />
          <strong>Check them first.</strong>
        </h1>
        <ol className="pps-fridge-steps">
          <li>Open Passphra.si and tap their name.</li>
          <li>Say your word. Listen for theirs.</li>
          <li>Words don&rsquo;t match? Hang up and call them on the number you know.</li>
        </ol>
        {people.length > 0 && (
          <>
            <p className="pps-fridge-label">People you can check</p>
            <ul className="pps-fridge-people">
              {people.map((p: Person) => (
                <li key={p.id}>
                  <strong>{p.name}</strong>
                  {p.relationship ? ` — ${p.relationship}` : ""}
                </li>
              ))}
            </ul>
          </>
        )}
        <p className="pps-fridge-foot">Never send money or codes just because a voice sounds right.</p>
      </article>
      <div className="pps-actions pps-no-print">
        <button type="button" className="pps-btn pps-btn-primary" onClick={() => window.print()}>
          <PrinterIcon size={24} />
          Print
        </button>
      </div>
    </div>
  );
}
