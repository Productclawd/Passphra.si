import { CheckIcon, ExclamationIcon } from "./Icons";

// A worked example for the first-run screen: the two paired phones side by
// side, so it's clear at a glance that each says one word and expects the
// other. Plain markup (not an image) so it scales with the phone's text size
// and needs nothing extra to work offline.

interface MiniPhoneProps {
  owner: string;
  other: string;
  say: string;
  expect: string;
}

function MiniPhone({ owner, other, say, expect }: MiniPhoneProps) {
  return (
    <div className="pps-how-phone">
      <p className="pps-how-owner">{owner}&rsquo;s phone</p>
      <p className="pps-how-label">You say</p>
      <p className="pps-how-word">{say}</p>
      <p className="pps-how-label">{other} should say</p>
      <p className="pps-how-word">{expect}</p>
    </div>
  );
}

export function HowItWorks() {
  return (
    <figure className="pps-how" aria-label="How it works, with an example">
      <div className="pps-how-phones">
        <MiniPhone owner="David" other="Lior" say="pasta" expect="cabin" />
        <MiniPhone owner="Lior" other="David" say="cabin" expect="pasta" />
      </div>
      <figcaption className="pps-how-caption">
        <span className="pps-how-row pps-how-ok">
          <CheckIcon size={20} strokeWidth={2.5} />
          Right word: it&rsquo;s really them.
        </span>
        <span className="pps-how-row pps-how-bad">
          <ExclamationIcon size={20} strokeWidth={2.5} />
          Wrong word, or none: hang up and call them back.
        </span>
      </figcaption>
    </figure>
  );
}
