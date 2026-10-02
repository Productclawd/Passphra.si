"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import jsQR from "jsqr";

// The native detector (Chrome on Android) is faster; iPhones don't have it, so
// jsQR decodes frames there. Typed locally — it isn't in the TS DOM lib yet.
interface DetectedBarcode {
  rawValue: string;
}
interface BarcodeDetectorLike {
  detect(source: HTMLVideoElement): Promise<DetectedBarcode[]>;
}
type BarcodeDetectorCtor = new (opts: { formats: string[] }) => BarcodeDetectorLike;

function nativeDetector(): BarcodeDetectorLike | null {
  const Ctor = (globalThis as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;
  if (!Ctor) return null;
  try {
    return new Ctor({ formats: ["qr_code"] });
  } catch {
    return null;
  }
}

interface QrScannerProps {
  /** Return true to stop scanning (code accepted), false to keep looking. */
  onResult: (text: string) => boolean;
}

const SCAN_INTERVAL_MS = 180;
const MAX_SIDE = 640;

export function QrScanner({ onResult }: QrScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onResultRef = useRef(onResult);
  useLayoutEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let stopped = false;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const detector = nativeDetector();

    const readFrame = async (video: HTMLVideoElement): Promise<string | null> => {
      if (detector) {
        try {
          const codes = await detector.detect(video);
          if (codes[0]?.rawValue) return codes[0].rawValue;
          return null;
        } catch {
          // fall through to jsQR
        }
      }
      if (!ctx || !video.videoWidth) return null;
      const scale = Math.min(1, MAX_SIDE / Math.max(video.videoWidth, video.videoHeight));
      canvas.width = Math.round(video.videoWidth * scale);
      canvas.height = Math.round(video.videoHeight * scale);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
      return jsQR(img.data, img.width, img.height)?.data ?? null;
    };

    const tick = async () => {
      const video = videoRef.current;
      if (stopped || !video) return;
      if (video.readyState >= 2) {
        const text = await readFrame(video);
        if (stopped) return;
        if (text && onResultRef.current(text)) {
          stopped = true;
          stream?.getTracks().forEach((t: MediaStreamTrack) => t.stop());
          return;
        }
      }
      timer = setTimeout(tick, SCAN_INTERVAL_MS);
    };

    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("This phone's browser can't use the camera here. Show your code instead.");
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (stopped) {
          stream.getTracks().forEach((t: MediaStreamTrack) => t.stop());
          return;
        }
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play().catch(() => undefined);
        tick();
      } catch {
        setError(
          "The camera is turned off for this app. Allow the camera in your phone's settings, or show your code instead."
        );
      }
    })();

    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      stream?.getTracks().forEach((t: MediaStreamTrack) => t.stop());
    };
  }, []);

  if (error) {
    return <p className="pps-scan-error">{error}</p>;
  }

  return (
    <div className="pps-scan">
      <video ref={videoRef} playsInline muted className="pps-scan-video" />
      <div className="pps-scan-frame" aria-hidden="true" />
    </div>
  );
}
