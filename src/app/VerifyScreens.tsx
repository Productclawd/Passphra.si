"use client";

import { useEffect, useState } from "react";
import {
  currentWindow,
  msLeftInWindow,
  otherRole,
  WINDOW_MS,
  wordsForWindow,
  type WindowWords,
} from "@/lib/passphrasi/words-engine";
import type { Person } from "@/lib/passphrasi/store";
import { CheckIcon, ExclamationIcon, PhoneIcon } from "./Icons";
import { BackButton, Monogram, type Nav } from "./shared";

// Phones set their clocks from the network, so they rarely disagree by more
// than a second or two. For this long either side of a change we also accept
// the neighbouring word, so a call that straddles the change still checks out.
const DRIFT_GRACE_MS = 10_000;

interface Words {
  window: number;
  prev: WindowWords;
  now: WindowWords;
  next: WindowWords;
}

function useRotatingWords(person: Person) {
  const [now, setNow] = useState(() => Date.now());
  const [words, setWords] = useState<Words | null>(null);
  const win = currentWindow(now);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      wordsForWindow(person.key, win - 1),
      wordsForWindow(person.key, win),
      wordsForWindow(person.key, win + 1),
    ]).then(([prev, cur, next]: WindowWords[]) => {
      if (!cancelled) setWords({ window: win, prev, now: cur, next });
    });
    return () => {
      cancelled = true;
    };
  }, [person.key, win]);

  return { words: words?.window === win ? words : null, msLeft: msLeftInWindow(now) };
}

interface PersonScreenProps {
  person: Person;
  nav: Nav;
}

export function VerifyScreen({ person, nav }: PersonScreenProps) {
  const { words, msLeft } = useRotatingWords(person);
  const mine = person.role;
  const theirs = otherRole(person.role);
  const secondsLeft = Math.ceil(msLeft / 1000);
  const elapsed = WINDOW_MS - msLeft;

  let alsoOk: string | null = null;
  if (words && elapsed < DRIFT_GRACE_MS) alsoOk = words.prev[theirs];
  else if (words && msLeft < DRIFT_GRACE_MS) alsoOk = words.next[theirs];

  return (
    <div className="pps-screen pps-verify">
      <div className="pps-topbar pps-topbar-split">
        <BackButton onClick={nav.back} />
        <button
          type="button"
          className="pps-link pps-link-quiet"
          onClick={() => nav.push({ name: "editPerson", id: person.id })}
        >
          Edit or remove
        </button>
      </div>

      <div className="pps-checking">
        <Monogram name={person.name} photo={person.photo} size="lg" />
        <div>
          <p className="pps-checking-label">Checking with</p>
          <h1 className="pps-checking-name">{person.name}</h1>
        </div>
      </div>

      <div className="pps-card pps-words" aria-live="polite">
        <div className="pps-words-half">
          <p className="pps-caps">You say</p>
          <p className="pps-word">{words ? words.now[mine] : " "}</p>
        </div>
        <div className="pps-words-half">
          <p className="pps-caps">{person.name} should say</p>
          <p className="pps-word">{words ? words.now[theirs] : " "}</p>
          {alsoOk && (
            <p className="pps-also">
              Their words may have just changed. <strong>{alsoOk}</strong> is also fine.
            </p>
          )}
        </div>
      </div>

      <div className="pps-timer">
        <div className="pps-timer-track">
          <div className="pps-timer-fill" style={{ width: `${(msLeft / WINDOW_MS) * 100}%` }} />
        </div>
        <p className="pps-timer-text">New words in {secondsLeft}s</p>
      </div>

      <div className="pps-actions">
        <button
          type="button"
          className="pps-btn pps-btn-primary"
          onClick={() => nav.replace({ name: "verified", id: person.id })}
        >
          The words match
        </button>
        <button
          type="button"
          className="pps-btn pps-btn-danger-outline"
          onClick={() => nav.replace({ name: "notThem", id: person.id })}
        >
          The words don&rsquo;t match
        </button>
      </div>
    </div>
  );
}

export function VerifiedScreen({ person, nav }: PersonScreenProps) {
  return (
    <div className="pps-screen pps-result pps-result-ok">
      <div className="pps-result-body">
        <span className="pps-result-mark pps-result-mark-ok">
          <CheckIcon size={64} strokeWidth={2.5} />
        </span>
        <p className="pps-caps pps-caps-ok">Verified</p>
        <h1 className="pps-headline">This is {person.name}.</h1>
        <p className="pps-body">The words matched. You can carry on talking.</p>
      </div>
      <div className="pps-actions">
        <button type="button" className="pps-btn pps-btn-primary" onClick={nav.home}>
          Done
        </button>
      </div>
    </div>
  );
}

export function NotThemScreen({ person, nav }: PersonScreenProps) {
  const tel = person.phone ? `tel:${person.phone.replace(/[^\d+]/g, "")}` : "tel:";
  return (
    <div className="pps-screen pps-result pps-result-bad">
      <div className="pps-result-body">
        <span className="pps-result-mark pps-result-mark-bad">
          <ExclamationIcon size={64} strokeWidth={2.75} />
        </span>
        <p className="pps-caps pps-caps-bad">Words don&rsquo;t match</p>
        <h1 className="pps-headline">This may not be {person.name}.</h1>
        <ol className="pps-card pps-steps">
          <li>
            <span className="pps-step-n">1</span>
            <span>Hang up now.</span>
          </li>
          <li>
            <span className="pps-step-n">2</span>
            <span>Call {person.name} on the number you know.</span>
          </li>
          <li className="pps-steps-note">
            Don&rsquo;t send money or codes, even if they sound upset.
          </li>
        </ol>
      </div>
      <div className="pps-actions">
        <a className="pps-btn pps-btn-danger" href={tel}>
          <PhoneIcon size={24} />
          Call {person.name} back
        </a>
        <button type="button" className="pps-link pps-link-center" onClick={nav.home}>
          Done
        </button>
      </div>
    </div>
  );
}
