import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Passphra.si — Is that really you?",
  description:
    "Shared passphrases to verify the person on the phone or video call is real. The cheap, human answer to deepfakes.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}