import React from 'react';

export type BuddyMood = 'happy' | 'neutral' | 'concerned';

/**
 * Hana — the household's companion, and Terry's sibling.
 *
 * Where Terry is a resting hexagon (flat top, points out to the sides), Hana
 * stands: her points are on the vertical axis, which makes her read as a little
 * house rather than a coin. The chimney and ribbon are what carry the rest —
 * she is a home, and homes are looked after.
 *
 * Light brown by design, fixed rather than themed, so she stays herself under
 * any accent colour — the same rule Terry follows with his emerald.
 *
 * Placeholder art: swap this SVG for the final character when it exists.
 */
export const HanaFace: React.FC<{ mood?: BuddyMood; className?: string }> = ({
  mood = 'happy',
  className,
}) => (
  <svg viewBox="0 0 72 72" className={className ?? 'h-full w-full'} aria-hidden>
    <style>{`
      @keyframes theria-hana-blink {
        0%, 90%, 100% { transform: scaleY(1); }
        94% { transform: scaleY(0.1); }
      }
      @keyframes theria-hana-look {
        0%, 40%, 100% { transform: translateX(0); }
        46%, 60% { transform: translateX(1.3px); }
        66%, 82% { transform: translateX(-1.1px); }
        88% { transform: translateX(0); }
      }
      @keyframes theria-hana-smoke {
        0% { transform: translateY(0) scale(0.7); opacity: 0; }
        25% { opacity: 0.55; }
        100% { transform: translateY(-9px) scale(1.25); opacity: 0; }
      }
      @keyframes theria-hana-ribbon {
        0%, 100% { transform: rotate(-4deg); }
        50% { transform: rotate(5deg); }
      }
      @keyframes theria-hana-blush {
        0%, 100% { opacity: 0.45; }
        50% { opacity: 0.72; }
      }
      .theria-hana-eyes {
        animation: theria-hana-blink 4.6s ease-in-out infinite;
        transform-origin: 50% 45%;
        transform-box: fill-box;
      }
      .theria-hana-pupils { animation: theria-hana-look 7.4s ease-in-out infinite; }
      .theria-hana-ribbon {
        animation: theria-hana-ribbon 3.6s ease-in-out infinite;
        transform-origin: 50px 26px;
      }
      .theria-hana-blush { animation: theria-hana-blush 5.4s ease-in-out infinite; }
      .theria-hana-puff { animation: theria-hana-smoke 3.4s ease-in-out infinite; }
      .theria-hana-puff-2 { animation-delay: 1.15s; }
      .theria-hana-puff-3 { animation-delay: 2.3s; }
    `}</style>

    {/* chimney smoke — little puffs drifting up, because someone is home */}
    <g fill="#E7D3BE">
      <circle className="theria-hana-puff" cx="22" cy="14" r="2.1" />
      <circle className="theria-hana-puff theria-hana-puff-2" cx="23.4" cy="14" r="1.7" />
      <circle className="theria-hana-puff theria-hana-puff-3" cx="21" cy="14" r="1.4" />
    </g>

    {/* chimney, tucked against the upper-left slope */}
    <g>
      <rect x="18.4" y="15.5" width="7.2" height="11" rx="2.1" fill="#A9704B" />
      <rect x="17.2" y="14" width="9.6" height="3.6" rx="1.8" fill="#C08A62" />
    </g>

    {/* body — a standing hexagon: points at top and bottom, flat sides */}
    <path
      d="M36 5 Q39 5 40.9 7.6 L57.6 20.4 Q60 22.3 60 25.4 L60 46.6 Q60 49.7 57.6 51.6 L40.9 64.4 Q39 67 36 67 Q33 67 31.1 64.4 L14.4 51.6 Q12 49.7 12 46.6 L12 25.4 Q12 22.3 14.4 20.4 L31.1 7.6 Q33 5 36 5 Z"
      fill="#C89B72"
    />
    {/* soft light on the upper slope, and a warm floor glow below */}
    <ellipse cx="29" cy="24" rx="13" ry="7.5" fill="#FFFFFF" opacity="0.18" />
    <ellipse cx="36" cy="54" rx="14" ry="8.5" fill="#FFF3E4" opacity="0.22" />

    {/* ribbon at her collar, sways gently */}
    <g className="theria-hana-ribbon">
      <path d="M50 26 L44.5 22.6 L44.5 29.4 Z" fill="#E8748C" />
      <path d="M50 26 L55.5 22.6 L55.5 29.4 Z" fill="#E8748C" />
      <circle cx="50" cy="26" r="2.5" fill="#F498A9" />
    </g>

    {/* eyes — blink, and glance about now and then */}
    <g className="theria-hana-eyes">
      <g className="theria-hana-pupils">
        <circle cx="28" cy="38" r="4.3" fill="#3B2415" />
        <circle cx="44" cy="38" r="4.3" fill="#3B2415" />
        <circle cx="29.5" cy="36.5" r="1.45" fill="#FFFFFF" opacity="0.9" />
        <circle cx="45.5" cy="36.5" r="1.45" fill="#FFFFFF" opacity="0.9" />
      </g>
    </g>

    {mood === 'concerned' && (
      <g stroke="#3B2415" strokeWidth="1.9" strokeLinecap="round" opacity="0.85">
        <path d="M23.5 31.8 L31 33.6" fill="none" />
        <path d="M48.5 31.8 L41 33.6" fill="none" />
      </g>
    )}

    <g className="theria-hana-blush">
      <circle cx="21.5" cy="45" r="2.7" fill="#F08FA0" />
      <circle cx="50.5" cy="45" r="2.7" fill="#F08FA0" />
    </g>

    {mood === 'happy' && (
      <path d="M29 46.5 Q36 53 43 46.5" stroke="#3B2415" strokeWidth="2.3" strokeLinecap="round" fill="none" />
    )}
    {mood === 'neutral' && (
      <path d="M31.5 48 Q36 50.8 40.5 48" stroke="#3B2415" strokeWidth="2.3" strokeLinecap="round" fill="none" />
    )}
    {mood === 'concerned' && (
      <path d="M30.5 50 Q36 45.8 41.5 50" stroke="#3B2415" strokeWidth="2.3" strokeLinecap="round" fill="none" />
    )}
  </svg>
);
