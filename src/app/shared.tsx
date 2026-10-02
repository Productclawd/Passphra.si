"use client";

import type { PairingLink } from "@/lib/passphrasi/remote-pairing";
import { ChevronLeftIcon, GitHubIcon } from "./Icons";

/** Public source, so anyone can check that nothing leaves the phone. */
export const SOURCE_URL = "https://github.com/Productclawd/Passphra.si";

export type Screen =
  | { name: "setup" }
  | { name: "home" }
  | { name: "verify"; id: string }
  | { name: "verified"; id: string }
  | { name: "notThem"; id: string }
  | { name: "pair"; repairId?: string }
  /** Pair by link: send an invite, or paste one you were sent. */
  | { name: "linkStart"; repairId?: string }
  /** An invite or reply link that was opened or pasted. */
  | { name: "link"; link: PairingLink }
  | { name: "gate" }
  | { name: "manage" }
  | { name: "editPerson"; id: string }
  | { name: "card" };

export interface Nav {
  push: (screen: Screen) => void;
  back: () => void;
  /** Clears the history and lands on Home (used by every "Done"). */
  home: () => void;
  /** Swaps the current screen without adding a Back step. */
  replace: (screen: Screen) => void;
}

interface MonogramProps {
  name: string;
  photo?: string | null;
  size?: "md" | "lg";
}

export function Monogram({ name, photo, size = "md" }: MonogramProps) {
  const initial = (name.trim()[0] ?? "?").toUpperCase();
  return (
    <span className={`pps-monogram pps-monogram-${size}`} aria-hidden="true">
      {/* A local data URL from the phone — nothing for next/image to optimise. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {photo ? <img src={photo} alt="" /> : initial}
    </span>
  );
}

export function BackButton({ onClick, label = "Back" }: { onClick: () => void; label?: string }) {
  return (
    <button type="button" className="pps-back" onClick={onClick}>
      <ChevronLeftIcon size={26} />
      <span>{label}</span>
    </button>
  );
}

export function SourceLink() {
  return (
    <a className="pps-source" href={SOURCE_URL} target="_blank" rel="noopener noreferrer">
      <GitHubIcon size={18} />
      <span>Open source: check the code yourself</span>
    </a>
  );
}

/** Downscales a picked photo to a small square JPEG for the monogram circle. */
export function photoToDataUrl(file: File, side = 192): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = side;
      canvas.height = side;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error("no canvas"));
        return;
      }
      const s = Math.min(img.naturalWidth, img.naturalHeight);
      ctx.drawImage(
        img,
        (img.naturalWidth - s) / 2,
        (img.naturalHeight - s) / 2,
        s,
        s,
        0,
        0,
        side,
        side
      );
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("bad image"));
    };
    img.src = url;
  });
}

export const RELATIONSHIPS = [
  "Son",
  "Daughter",
  "Grandson",
  "Granddaughter",
  "Wife",
  "Husband",
  "Brother",
  "Sister",
  "Friend",
];
