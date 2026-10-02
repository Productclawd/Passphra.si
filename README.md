# Passphra.si

**Check it's really them before you send money or a code.**

Voices and faces can now be cloned in real time. Passphra.si gives you and your family two words that change every minute. When someone calls asking for money or a code, you each say your word. A copied voice can't know them.

**Use it:** https://productclawd.github.io/Passphra.si/ (install it to your home screen and it works without signal).

This repository is the full source, so you can check the claims below yourself.

## What it promises, and where to check

| Claim | Where to look |
| --- | --- |
| No server, no account, no analytics. Nothing you type leaves the phone. | There is no backend. The site is static files (`output: "export"` in `next.config.ts`), and no code calls `fetch` with your data. |
| Your key can't be read back out, even by the app's own code. | `src/lib/passphrasi/words-engine.ts`: `importSecret` imports with `extractable: false`. Keys are stored as `CryptoKey`s in IndexedDB (`src/lib/passphrasi/store.ts`). |
| A word heard on a call is useless a minute later. | `wordsForWindow`: HMAC-SHA256 over the current 60-second window (the same construction as 2FA codes, rendered as a word). |
| Hearing your word tells an impostor nothing about theirs. | Each side's word comes from a different HMAC label (`A\|window`, `B\|window`). |
| Pairing by link never sends the secret. | `src/lib/passphrasi/remote-pairing.ts`: each link carries only an ECDH P-256 *public* key, and both phones derive the key locally. |

## How pairing works

- **In person (recommended):** one phone shows a QR code holding a fresh random 32-byte secret, and the other scans it. The QR is deliberately not a URL, so a camera app that scans it opens nothing.
- **By link:** the inviter sends a link with their public key. The other person accepts and sends one back with theirs. Each phone runs ECDH followed by HKDF and ends up with the same key. To catch someone swapping both links in transit, both phones show a check word that you compare out loud before saving.

The app works offline. The service worker (`public/sw.js`) caches only the app's own build files. Names and keys live in IndexedDB and never pass through it.

## Develop

```bash
npm ci
npm run dev      # http://localhost:3000/Passphra.si
npm run build    # static site in ./out
```

Every push to `main` deploys to GitHub Pages (`.github/workflows/pages.yml`).

Do not reorder `src/lib/passphrasi/words.ts`. Paired phones agree on word positions, so any change to the list needs a version bump.
