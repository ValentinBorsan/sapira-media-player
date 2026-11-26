interface PrismLogoProps {
  size: number;
  /** When true the prism light sweep runs (playing); otherwise it rests. */
  active?: boolean;
  /** Slow idle variant used on the empty/start screen. */
  idle?: boolean;
  /** Sweep is driven externally via --sweep-p / --sweep-o CSS variables (music sync). */
  synced?: boolean;
  className?: string;
}

/**
 * Sapira signature animation: a beam of prismatic light travels along the
 * ribbon of the logo (masked by the logo itself, so it never spills outside).
 */
export function PrismLogo({
  size,
  active = true,
  idle = false,
  synced = false,
  className = '',
}: PrismLogoProps) {
  const maskUrl = 'url(./sapira-logo.png)';
  return (
    <div
      className={`prism-logo ${active ? 'is-active' : ''} ${idle ? 'is-idle' : ''} ${synced ? 'is-synced' : ''} ${className}`}
      style={{ width: size, height: size }}
    >
      <img src="./sapira-logo.png" alt="Sapira Media Player" className="prism-logo-img" draggable={false} />
      <span
        className="prism-sweep"
        style={{ WebkitMaskImage: maskUrl, maskImage: maskUrl }}
        aria-hidden="true"
      />
      <span
        className="prism-sweep prism-sweep-echo"
        style={{ WebkitMaskImage: maskUrl, maskImage: maskUrl }}
        aria-hidden="true"
      />
    </div>
  );
}
