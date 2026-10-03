/**
 * Passphra.si must run in the phone's real browser. A link tapped inside X,
 * Instagram, Facebook etc. opens in that app's built-in browser instead, which
 * keeps its own storage, separate from Safari/Chrome (and may drop it). A
 * pairing saved there is lost to the person, or it never saves at all.
 * So we spot those browsers and send people to the real one.
 */

/** Built-in browsers we can name from the user agent. */
const NAMED_APPS: ReadonlyArray<[RegExp, string]> = [
  [/Twitter|TwitterAndroid/i, "X"],
  [/Instagram/i, "Instagram"],
  [/FBAN|FBAV|FB_IAB|FBIOS/i, "Facebook"],
  [/LinkedInApp/i, "LinkedIn"],
  [/musical_ly|BytedanceWebview|TikTok/i, "TikTok"],
  [/Snapchat/i, "Snapchat"],
  [/\bLine\//i, "LINE"],
  [/MicroMessenger/i, "WeChat"],
  [/\bGSA\//i, "the Google app"],
];

export interface InAppBrowser {
  /** The app's name, or null when it's a built-in browser we can't name. */
  app: string | null;
}

export function isIos(ua: string = navigator.userAgent): boolean {
  return /iPhone|iPad|iPod/.test(ua);
}

/**
 * Null when this looks like a real browser. `installed` must be true for the
 * home-screen app: on iPhone it has no "Safari/" in its user agent either.
 */
export function detectInAppBrowser(installed: boolean, ua: string = navigator.userAgent): InAppBrowser | null {
  if (installed) return null;
  for (const [pattern, app] of NAMED_APPS) {
    if (pattern.test(ua)) return { app };
  }
  // Every real iPhone browser (Safari, Chrome, Firefox, Edge, DuckDuckGo…)
  // ends its user agent with "Safari/…". An app's plain web view doesn't.
  if (isIos(ua) && !/Safari\//.test(ua)) return { app: null };
  return null;
}

/**
 * Opens the same address in Safari from inside another app (iOS 17+). Older
 * phones ignore it, so the screen also offers Copy.
 */
export function safariUrl(url: string): string {
  return url.replace(/^https:\/\//, "x-safari-https://");
}

/**
 * Checks this browser can do what pairing needs: keep a non-extractable key in
 * IndexedDB. Uses its own throwaway database, so the real one is untouched.
 */
export async function canStoreKeys(): Promise<boolean> {
  const name = "passphrasi-probe";
  try {
    const key = await crypto.subtle.importKey(
      "raw",
      crypto.getRandomValues(new Uint8Array(32)),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open(name, 1);
      req.onupgradeneeded = () => req.result.createObjectStore("probe");
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction("probe", "readwrite");
        tx.objectStore("probe").put(key, "k");
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      });
    } finally {
      db.close();
      indexedDB.deleteDatabase(name);
    }
    return true;
  } catch {
    return false;
  }
}
