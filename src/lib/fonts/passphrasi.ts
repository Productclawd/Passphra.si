/**
 * Newsreader (serif) for headlines, names and the spoken words; Atkinson
 * Hyperlegible for everything else — it was designed for low-vision readers.
 * Vendored (not next/font/google) so builds never depend on Google's servers.
 */
import localFont from "next/font/local";

export const newsreader = localFont({
  src: "./files/newsreader-variable.woff2",
  weight: "400 600",
  variable: "--font-newsreader",
  display: "swap",
  fallback: ["Georgia", "serif"],
});

export const atkinson = localFont({
  src: [
    { path: "./files/atkinson-hyperlegible-400.woff2", weight: "400", style: "normal" },
    { path: "./files/atkinson-hyperlegible-700.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-atkinson",
  display: "swap",
  fallback: ["system-ui", "sans-serif"],
});
