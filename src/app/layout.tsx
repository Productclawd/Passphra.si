import type { Metadata, Viewport } from "next";
import { atkinson, newsreader } from "@/lib/fonts/passphrasi";
import { BASE_PATH } from "@/lib/base-path";
import "./globals.css";
import "./passphrasi.css";

const SITE_URL = "https://productclawd.github.io/Passphra.si/";
const TITLE = "Passphra.si — Check it's really them";
const DESCRIPTION =
  "Two words that change every minute, shared only with your family, so you can check a caller is really them before sending money or a code.";
// Metadata URLs don't get basePath added, so they're spelled out in full.
const OG_IMAGE = {
  url: `${SITE_URL}og.png`,
  width: 1200,
  height: 630,
  alt: "Two paired phones: each shows the word to say and the word the other person should say.",
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  applicationName: "Passphra.si",
  manifest: `${BASE_PATH}/manifest.webmanifest`,
  icons: {
    icon: [{ url: `${BASE_PATH}/icon-192.png`, sizes: "192x192", type: "image/png" }],
    apple: [{ url: `${BASE_PATH}/apple-touch-icon.png`, sizes: "180x180" }],
  },
  appleWebApp: { capable: true, title: "Passphra.si", statusBarStyle: "default" },
  formatDetection: { telephone: false },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "Passphra.si",
    title: TITLE,
    description: DESCRIPTION,
    images: [OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [OG_IMAGE.url],
  },
};

export const viewport: Viewport = {
  themeColor: "#FAF9F5",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className={`pps ${newsreader.variable} ${atkinson.variable}`}>{children}</div>
      </body>
    </html>
  );
}
