import { BASE_PATH } from "@/lib/base-path";

// The 30s explainer (rendered with Remotion from the ProductClank repo). Served from
// this site, not a video host, so watching it sends nothing to a third party.
// preload="none": nothing downloads until someone taps play.
export function ExplainerVideo() {
  return (
    <figure className="pps-video">
      <video
        className="pps-video-player"
        src={`${BASE_PATH}/explainer.mp4`}
        poster={`${BASE_PATH}/explainer-poster.jpg`}
        controls
        playsInline
        preload="none"
        aria-label="30-second video: how Passphra.si works"
      />
      <figcaption className="pps-small">Watch how it works (30 seconds, captioned)</figcaption>
    </figure>
  );
}
