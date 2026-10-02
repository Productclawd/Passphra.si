/**
 * Where the app is served from: "/Passphra.si" on GitHub Pages (see
 * next.config.ts). Next adds it to pages and build files on its own, but not
 * to hand-written URLs — the service worker, manifest, icons and pairing links.
 */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
