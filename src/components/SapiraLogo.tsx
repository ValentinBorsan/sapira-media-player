import { useId } from 'react';

interface SapiraLogoProps {
  size?: number;
  className?: string;
}

/**
 * Sapira Luminous Sapphire Prism Brand Mark
 * Features lighter opalescent crystal facets, optical lens arcs,
 * 5 inner harmonic soundwave bars, and apex starlight refraction.
 */
export function SapiraLogo({ size = 24, className }: SapiraLogoProps) {
  const uid = useId().replace(/:/g, '');

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`${uid}-prism`} x1="10" y1="8" x2="56" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#F5D0FE" />
          <stop offset="45%" stopColor="#BAE6FD" />
          <stop offset="100%" stopColor="#67E8F9" />
        </linearGradient>
        <linearGradient id={`${uid}-lower`} x1="12" y1="54" x2="55" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#C4B5FD" />
          <stop offset="52%" stopColor="#93C5FD" />
          <stop offset="100%" stopColor="#7DD3FC" />
        </linearGradient>
        <linearGradient id={`${uid}-rim`} x1="10" y1="8" x2="56" y2="34" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="55%" stopColor="#E0F2FE" />
          <stop offset="100%" stopColor="#FFFFFF" />
        </linearGradient>
        <linearGradient id={`${uid}-wave`} x1="30" y1="24" x2="30" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="50%" stopColor="#BAE6FD" />
          <stop offset="100%" stopColor="#F5D0FE" />
        </linearGradient>
      </defs>

      {/* Outer luminous faceted sapphire play prism */}
      <path
        d="M18.8 9.8C14.8 9.8 12 12.8 12 17V47C12 51.2 14.8 54.2 18.8 54.2C20.9 54.2 23.1 53.5 25.3 52.2L51.8 36.9C55.9 34.5 55.9 29.5 51.8 27.1L25.3 11.8C23.1 10.5 20.9 9.8 18.8 9.8Z"
        fill={`url(#${uid}-prism)`}
        fillOpacity="0.94"
        stroke={`url(#${uid}-rim)`}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />

      {/* Lower crystal bevel plane */}
      <path
        d="M14.2 51.8L23.2 42.5L43.2 32L53.8 33.8C53.2 35.1 52.5 36.2 51.4 36.9L25.3 52.2C21.2 54.5 16.4 54.1 14.2 51.8Z"
        fill={`url(#${uid}-lower)`}
        fillOpacity="0.75"
      />

      {/* Crisp sapphire facet ridges */}
      <path
        d="M23.2 21.5L53.4 29.6M43.2 32L17.5 52.8M23.2 42.5L15.2 12.2"
        stroke="#FFFFFF"
        strokeOpacity="0.7"
        strokeWidth="1.1"
        strokeLinecap="round"
      />

      {/* Inner acoustic & cinema chamber */}
      <path
        d="M22.8 20.8C22.8 19.4 24.3 18.5 25.5 19.2L43.2 29.5C44.4 30.2 44.4 31.8 43.2 32.5L25.5 42.8C24.3 43.5 22.8 42.6 22.8 41.2V20.8Z"
        fill="#070B16"
        fillOpacity="0.88"
        stroke="#E0F2FE"
        strokeOpacity="0.72"
        strokeWidth="1.1"
      />

      {/* Optical lens iris arcs */}
      <path
        d="M26.2 25.2A6.5 6.5 0 0 1 35.4 26.8M35.4 35.2A6.5 6.5 0 0 1 26.2 36.8"
        stroke="#BAE6FD"
        strokeOpacity="0.75"
        strokeWidth="1"
        strokeLinecap="round"
      />

      {/* 5 Symmetrical Harmonic Soundwave Bars */}
      <g stroke={`url(#${uid}-wave)`} strokeWidth="1.6" strokeLinecap="round">
        <line x1="26.2" y1="29.4" x2="26.2" y2="32.6" />
        <line x1="28.7" y1="27.5" x2="28.7" y2="34.5" />
        <line x1="31.2" y1="25.6" x2="31.2" y2="36.4" />
        <line x1="33.7" y1="27.5" x2="33.7" y2="34.5" />
        <line x1="36.2" y1="29.4" x2="36.2" y2="32.6" />
      </g>

      {/* Apex Starlight Refraction Spark */}
      <path
        d="M54.2 28.5V35.5M50.7 32H57.7"
        stroke="#FFFFFF"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}
