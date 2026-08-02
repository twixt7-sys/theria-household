import React from 'react';
import { cn } from '../lib/cn';

/**
 * Theria's logomark, carried over from Finance so the two apps read as one
 * family.
 *
 * This is Finance's artwork verbatim — brackets plus the green F — used as a
 * placeholder until the Household mark is drawn. The source PNG sits at
 * `public/theria-logo.png`; when the real mark arrives, replace the paths here
 * and that file together.
 */

const BRAND_SLOGAN = 'See the state of your home at a glance.';

/** Shared silhouettes so the flat and gradient treatments can never drift apart. */
const BRACKET_PATHS = ['M104 27 L31 89 L31 182', 'M171 283 L244 221 L244 128'] as const;
const F_PATH =
  'M125 91 L210 91 L195 122 L130 122 L130 152 L185 152 L170 183 L130 183 L130 228 L100 242 L100 112 Z';

export const TheriaLogoMark: React.FC<{
  className?: string;
  variant?: 'gradient' | 'flat';
}> = ({ className, variant = 'gradient' }) => {
  // Unique per-instance so gradient defs never collide when several logos mount.
  const uid = React.useId().replace(/:/g, '');
  const steelId = `theria-steel-${uid}`;
  const greenId = `theria-green-${uid}`;
  const sheenId = `theria-sheen-${uid}`;

  if (variant === 'flat') {
    return (
      <svg viewBox="0 0 275 310" className={className} aria-hidden>
        <g fill="none" stroke="#878787" strokeWidth="33" strokeLinecap="round" strokeLinejoin="round">
          {BRACKET_PATHS.map((d) => (
            <path key={d} d={d} />
          ))}
        </g>
        <path d={F_PATH} fill="#2A633A" stroke="#2A633A" strokeWidth="7" strokeLinejoin="round" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 275 310" className={className} aria-hidden>
      <defs>
        <linearGradient id={steelId} x1="20" y1="20" x2="255" y2="290" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#b9bfc6" />
          <stop offset="0.5" stopColor="#8a9096" />
          <stop offset="1" stopColor="#5f656b" />
        </linearGradient>
        <linearGradient id={greenId} x1="100" y1="91" x2="200" y2="242" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#3a8a52" />
          <stop offset="0.55" stopColor="#2A633A" />
          <stop offset="1" stopColor="#1c4529" />
        </linearGradient>
        <linearGradient id={sheenId} x1="100" y1="91" x2="100" y2="242" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.35" />
          <stop offset="0.4" stopColor="#ffffff" stopOpacity="0.06" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>

      <g
        fill="none"
        stroke={`url(#${steelId})`}
        strokeWidth="33"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {BRACKET_PATHS.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>
      <path d={F_PATH} fill={`url(#${greenId})`} stroke="#1c4529" strokeWidth="7" strokeLinejoin="round" />
      <path d={F_PATH} fill={`url(#${sheenId})`} />
    </svg>
  );
};

export const TheriaBrandLogo: React.FC<{
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  variant?: 'gradient' | 'flat';
}> = ({ size = 'md', className, variant }) => (
  <TheriaLogoMark
    variant={variant}
    className={cn(
      'w-auto shrink-0',
      size === 'sm' ? 'h-9' : size === 'lg' ? 'h-12' : 'h-11',
      className,
    )}
  />
);

export const TheriaBrandWordmark: React.FC<{
  className?: string;
  layout?: 'stack' | 'inline';
  size?: 'default' | 'compact' | 'lg';
  showSlogan?: boolean;
}> = ({ className, layout = 'inline', size = 'default', showSlogan = false }) => {
  const textSize =
    size === 'compact'
      ? 'text-[8px] tracking-wide'
      : size === 'lg'
        ? 'text-xs uppercase tracking-[0.14em]'
        : 'text-[9px] uppercase tracking-[0.16em]';

  const title = <p className={cn('font-bold leading-none text-foreground', textSize)}>Theria</p>;
  const subtitle = (
    <p className={cn('font-semibold leading-none text-primary/90', textSize)}>Household</p>
  );

  return (
    <div
      className={cn(
        'min-w-0 text-left',
        layout === 'stack' && 'flex flex-col items-start justify-center gap-0',
        className,
      )}
    >
      {layout === 'inline' ? (
        <div className="flex items-baseline gap-0.5">
          {title}
          {subtitle}
        </div>
      ) : (
        <>
          {title}
          {subtitle}
        </>
      )}
      {showSlogan && (
        <p className="mt-1.5 text-[10px] leading-snug text-muted-foreground">{BRAND_SLOGAN}</p>
      )}
    </div>
  );
};

export { BRAND_SLOGAN };
