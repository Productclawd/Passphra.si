"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  getSettings,
  listInvites,
  listPeople,
  requestPersistence,
  saveSettings,
  type LinkInvite,
  type Person,
} from "@/lib/passphrasi/store";
import { parsePairingLink, type PairingLink } from "@/lib/passphrasi/remote-pairing";
import { BASE_PATH } from "@/lib/base-path";
import { ChevronRightIcon, ShieldIcon } from "./Icons";
import { InstallHelp } from "./InstallHelp";
import { EditPersonScreen, FridgeCardScreen, GateScreen, ManageScreen } from "./ManageScreens";
import { PairingFlow } from "./PairingFlow";
import { HowItWorks } from "./HowItWorks";
import { LinkScreen, LinkStartScreen, PendingInvites } from "./RemotePairing";
import { Monogram, SourceLink, type Nav, type Screen } from "./shared";
import { NotThemScreen, VerifiedScreen, VerifyScreen } from "./VerifyScreens";

const HOME: Screen = { name: "home" };

/**
 * Reads a pairing link out of the address bar and clears it, so a refresh or
 * Back doesn't re-open it. The link holds no secret; this is just tidiness.
 */
function takeLinkFromUrl(): PairingLink | null {
  const link = parsePairingLink(window.location.hash);
  if (window.location.hash) {
    window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search);
  }
  return link;
}

/**
 * Screens live in a stack mirrored onto browser history, so the phone's own
 * Back gesture/button steps back one screen instead of leaving the app.
 */
function useScreenStack(initial: Screen) {
  const [stack, setStack] = useState<Screen[]>([initial]);
  const stackRef = useRef(stack);
  useLayoutEffect(() => {
    stackRef.current = stack;
  }, [stack]);
  const ignorePops = useRef(0);

  useEffect(() => {
    const onPop = () => {
      if (ignorePops.current > 0) {
        ignorePops.current -= 1;
        return;
      }
      setStack((s: Screen[]) => (s.length > 1 ? s.slice(0, -1) : s));
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const nav: Nav = {
    push: (screen: Screen) => {
      window.history.pushState({ pps: true }, "");
      setStack((s: Screen[]) => [...s, screen]);
      window.scrollTo(0, 0);
    },
    back: () => {
      if (stackRef.current.length > 1) window.history.back();
    },
    replace: (screen: Screen) => {
      setStack((s: Screen[]) => [...s.slice(0, -1), screen]);
      window.scrollTo(0, 0);
    },
    home: () => {
      const depth = stackRef.current.length - 1;
      setStack([HOME]);
      window.scrollTo(0, 0);
      if (depth > 0) {
        ignorePops.current += 1;
        window.history.go(-depth);
      }
    },
  };

  const reset = useCallback((screen: Screen) => setStack([screen]), []);
  return { screen: stack[stack.length - 1], nav, reset };
}

function registerOffline() {
  if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
  navigator.serviceWorker
    .register(`${BASE_PATH}/sw.js`, { scope: `${BASE_PATH}/` })
    .then(() => navigator.serviceWorker.ready)
    .then((reg: ServiceWorkerRegistration) => {
      // Hand over the build files this first visit already loaded, so the app
      // opens offline from now on without a second visit.
      const urls = performance
        .getEntriesByType("resource")
        .map((e: PerformanceEntry) => e.name)
        .filter((u: string) => u.startsWith(window.location.origin));
      reg.active?.postMessage({ type: "cache-urls", urls });
    })
    .catch(() => undefined);
}

export function PassphrasiApp() {
  const [loaded, setLoaded] = useState(false);
  const [ownerName, setOwnerName] = useState("");
  const [people, setPeople] = useState<Person[]>([]);
  const [invites, setInvites] = useState<LinkInvite[]>([]);
  const { screen, nav, reset } = useScreenStack(HOME);
  /** A link opened before this phone was set up — picked up after Setup. */
  const linkAfterSetup = useRef<PairingLink | null>(null);

  const reload = useCallback(async () => {
    const [settings, list, pending] = await Promise.all([getSettings(), listPeople(), listInvites()]);
    setOwnerName(settings?.ownerName ?? "");
    setPeople(list);
    setInvites(pending);
    return settings;
  }, []);

  useEffect(() => {
    const opened = takeLinkFromUrl();
    // Loading from IndexedDB is syncing with an external system, which is what effects are for.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload()
      .then((settings: Awaited<ReturnType<typeof getSettings>>) => {
        if (!settings) {
          linkAfterSetup.current = opened;
          reset({ name: "setup" });
        } else if (opened) {
          reset({ name: "link", link: opened });
        }
      })
      .finally(() => setLoaded(true));
    requestPersistence();
    registerOffline();
  }, [reload, reset]);

  // A link opened while the app is already showing in this tab.
  useEffect(() => {
    const onHash = () => {
      const opened = takeLinkFromUrl();
      if (opened) reset({ name: "link", link: opened });
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [reset]);

  if (!loaded) return <div className="pps-screen" aria-busy="true" />;

  const personFor = (id: string): Person | undefined => people.find((p: Person) => p.id === id);

  switch (screen.name) {
    case "setup":
      return (
        <SetupScreen
          onDone={async (name: string) => {
            await saveSettings({ ownerName: name });
            await reload();
            const link = linkAfterSetup.current;
            linkAfterSetup.current = null;
            reset(link ? { name: "link", link } : HOME);
          }}
        />
      );
    case "verify":
    case "verified":
    case "notThem": {
      const person = personFor(screen.id);
      if (!person) return <HomeScreen ownerName={ownerName} people={people} invites={invites} nav={nav} onChanged={reload} />;
      if (screen.name === "verify") return <VerifyScreen key={person.id} person={person} nav={nav} />;
      if (screen.name === "verified") return <VerifiedScreen person={person} nav={nav} />;
      return <NotThemScreen person={person} nav={nav} />;
    }
    case "pair":
      return (
        <PairingFlow
          ownerName={ownerName}
          existing={screen.repairId ? personFor(screen.repairId) ?? null : null}
          nav={nav}
          onSaved={async () => {
            await reload();
          }}
        />
      );
    case "linkStart":
      return (
        <LinkStartScreen
          ownerName={ownerName}
          existing={screen.repairId ? personFor(screen.repairId) ?? null : null}
          nav={nav}
          onChanged={async () => {
            await reload();
          }}
        />
      );
    case "link":
      return (
        <LinkScreen
          key={screen.link.id + screen.link.kind}
          link={screen.link}
          ownerName={ownerName}
          people={people}
          nav={nav}
          onChanged={async () => {
            await reload();
          }}
        />
      );
    case "gate":
      return <GateScreen nav={nav} />;
    case "manage":
      return (
        <ManageScreen
          ownerName={ownerName}
          people={people}
          nav={nav}
          onChanged={async () => {
            await reload();
          }}
        />
      );
    case "editPerson": {
      const person = personFor(screen.id);
      if (!person) return <HomeScreen ownerName={ownerName} people={people} invites={invites} nav={nav} onChanged={reload} />;
      return (
        <EditPersonScreen
          key={person.id}
          person={person}
          nav={nav}
          onChanged={async () => {
            await reload();
          }}
        />
      );
    }
    case "card":
      return <FridgeCardScreen people={people} nav={nav} />;
    case "home":
    default:
      return <HomeScreen ownerName={ownerName} people={people} invites={invites} nav={nav} onChanged={reload} />;
  }
}

interface HomeScreenProps {
  ownerName: string;
  people: Person[];
  invites: LinkInvite[];
  nav: Nav;
  onChanged: () => Promise<unknown>;
}

function HomeScreen({ ownerName, people, invites, nav, onChanged }: HomeScreenProps) {
  return (
    <div className="pps-screen">
      <header className="pps-brand">
        <ShieldIcon size={26} />
        <span>Passphra.si</span>
      </header>

      {ownerName && <p className="pps-greeting">Hello, {ownerName}</p>}
      <h1 className="pps-headline">Who would you like to check?</h1>

      <p className="pps-rule">
        Asked for money or a code? <strong>Check them first.</strong>
      </p>

      {people.length > 0 ? (
        <ul className="pps-card pps-list">
          {people.map((p: Person) => (
            <li key={p.id}>
              <button
                type="button"
                className="pps-row"
                onClick={() => nav.push({ name: "verify", id: p.id })}
              >
                <Monogram name={p.name} photo={p.photo} />
                <span className="pps-row-text">
                  <span className="pps-row-name">{p.name}</span>
                  {p.relationship && <span className="pps-row-rel">{p.relationship}</span>}
                </span>
                <ChevronRightIcon size={28} className="pps-row-chevron" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="pps-card pps-empty">
          <p className="pps-body">No one here yet.</p>
          <p className="pps-small">
            Add each family member with both phones together, or send them a link. It takes about a
            minute.
          </p>
          <button type="button" className="pps-btn pps-btn-primary" onClick={() => nav.push({ name: "pair" })}>
            Add someone
          </button>
        </div>
      )}

      <PendingInvites
        invites={invites}
        ownerName={ownerName}
        nav={nav}
        onChanged={async () => {
          await onChanged();
        }}
      />

      <footer className="pps-home-foot">
        {people.length > 0 && (
          <button type="button" className="pps-link" onClick={() => nav.push({ name: "pair" })}>
            Add someone
          </button>
        )}
        <button type="button" className="pps-link pps-link-quiet" onClick={() => nav.push({ name: "gate" })}>
          Settings
        </button>
      </footer>
      <SourceLink />
    </div>
  );
}

function SetupScreen({ onDone }: { onDone: (name: string) => Promise<void> }) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  return (
    <div className="pps-screen">
      <header className="pps-brand">
        <ShieldIcon size={26} />
        <span>Passphra.si</span>
      </header>
      <h1 className="pps-headline">Check it&rsquo;s really them</h1>
      <p className="pps-body">
        Voices and faces can be copied. Passphra.si gives you and your family two words that change
        every minute, so you can check who you&rsquo;re talking to before sending money or a code.
      </p>
      <HowItWorks />
      <p className="pps-small">
        Best set up together, in person, or by sending a link. No account, no sign-up, and your
        words are never sent anywhere.
      </p>

      <label className="pps-field">
        <span className="pps-label">Whose phone is this? First name</span>
        <input
          className="pps-input"
          value={name}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
          autoCapitalize="words"
          autoComplete="given-name"
          maxLength={40}
          placeholder="David"
        />
      </label>

      <InstallHelp />

      <div className="pps-actions">
        <button
          type="button"
          className="pps-btn pps-btn-primary"
          disabled={!name.trim() || saving}
          onClick={async () => {
            setSaving(true);
            await onDone(name.trim());
          }}
        >
          Continue
        </button>
      </div>
      <SourceLink />
    </div>
  );
}
