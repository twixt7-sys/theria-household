import React from 'react';

export type BuddyMood = 'happy' | 'neutral' | 'concerned';

/**
 * Hana — the household's companion, and Terry's sibling.
 *
 * Where Terry is a resting hexagon (flat top, points out to the sides), Hana
 * stands: her points are on the vertical axis, which makes her read as a little
 * house rather than a coin. The points are deliberately blunt and the body
 * squat — a sharp, tall hexagon reads as a gem, not a home.
 *
 * Chimney on the right, ribbon on the left, so the two never crowd each other.
 * Light brown by design, fixed rather than themed, so she stays herself under
 * any accent colour — the same rule Terry follows with his emerald.
 *
 * Flat colour throughout: highlights are rounded squares at low opacity rather
 * than gradients, which keeps her readable at 24px and in either theme.
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
        46%, 60% { transform: translateX(1.4px); }
        66%, 82% { transform: translateX(-1.2px); }
        88% { transform: translateX(0); }
      }
      @keyframes theria-hana-smoke {
        0% { transform: translate(0, 0) scale(0.55); opacity: 0; }
        18% { opacity: 0.65; }
        70% { opacity: 0.3; }
        100% { transform: translate(1.5px, -6.5px) scale(1.25); opacity: 0; }
      }
      /* Sways around a clockwise tilt, so the bow sits at a jaunty angle
         rather than square on. */
      @keyframes theria-hana-ribbon {
        0%, 100% { transform: rotate(8deg); }
        50% { transform: rotate(17deg); }
      }
      @keyframes theria-hana-blush {
        0%, 100% { opacity: 0.5; }
        50% { opacity: 0.8; }
      }
      .theria-hana-eyes {
        animation: theria-hana-blink 4.6s ease-in-out infinite;
        transform-origin: 50% 45%;
        transform-box: fill-box;
      }
      .theria-hana-pupils { animation: theria-hana-look 7.4s ease-in-out infinite; }
      .theria-hana-ribbon {
        animation: theria-hana-ribbon 3.4s ease-in-out infinite;
        transform-box: fill-box;
        transform-origin: center;
      }
      .theria-hana-blush { animation: theria-hana-blush 5.2s ease-in-out infinite; }
      /* fill-box is load-bearing: without it the puffs scale about the SVG
         origin and fling themselves off the canvas instead of drifting up. */
      .theria-hana-puff {
        animation: theria-hana-smoke 3s ease-out infinite;
        transform-box: fill-box;
        transform-origin: center;
      }
      .theria-hana-puff-2 { animation-delay: 1.05s; }
      .theria-hana-puff-3 { animation-delay: 2.1s; }
    `}</style>

    {/* chimney — squat and wide so it reads as a chimney, not a bottle neck.
        Drawn before the body, so the roof edge buries its base. */}
    <g stroke="#8E5F3D" strokeWidth="1.4" strokeLinejoin="round">
      <rect x="47.8" y="18" width="8.4" height="9" rx="1.8" fill="#A9704B" />
      <rect x="46.2" y="15.2" width="11.6" height="4" rx="1.9" fill="#C08A62" />
    </g>

    {/* smoke — little puffs drifting up and away from the cap */}
    <g fill="#E4CDB4">
      <circle className="theria-hana-puff" cx="51.5" cy="12.6" r="2" />
      <circle className="theria-hana-puff theria-hana-puff-2" cx="53.4" cy="12.2" r="1.6" />
      <circle className="theria-hana-puff theria-hana-puff-3" cx="50.1" cy="13" r="1.3" />
    </g>

    {/* body — a squat standing hexagon with blunt points and a sticker outline */}
    <path
      d="M29.5 17 Q36 13 42.5 17 L55.5 25.5 Q59 27.7 59 31.5 L59 42.5 Q59 46.3 55.5 48.5 L42.5 57 Q36 61 29.5 57 L16.5 48.5 Q13 46.3 13 42.5 L13 31.5 Q13 27.7 16.5 25.5 Z"
      fill="#C89B72"
      stroke="#A97C52"
      strokeWidth="2"
      strokeLinejoin="round"
    />

    {/* roof shine — rounded squares, never gradients */}
    <rect
      x="23.4"
      y="23.4"
      width="5.6"
      height="5.6"
      rx="2.3"
      fill="#FFFFFF"
      opacity="0.2"
      transform="rotate(-15 26.2 26.2)"
    />
    <rect
      x="30.8"
      y="19.4"
      width="2.9"
      height="2.9"
      rx="1.2"
      fill="#FFFFFF"
      opacity="0.16"
      transform="rotate(-15 32.25 20.85)"
    />

    {/* ribbon — left side, outlined so it holds its shape against the body.
        Sits high on the slope like a bow clipped to the corner of her head;
        the tilt comes from the sway keyframes rather than a transform, which
        the animation would otherwise overwrite. */}
    <g className="theria-hana-ribbon" stroke="#C2495F" strokeWidth="1.1" strokeLinejoin="round">
      <path d="M23 26.6 L18.4 23.6 L18.4 29.6 Z" fill="#E8748C" />
      <path d="M23 26.6 L27.6 23.6 L27.6 29.6 Z" fill="#E8748C" />
      <circle cx="23" cy="26.6" r="2.3" fill="#F498A9" />
    </g>

    {/* eyes — big and wide-set, one rounded-square glint at the top right */}
    <g className="theria-hana-eyes">
      <g className="theria-hana-pupils">
        <circle cx="26.5" cy="35" r="5.2" fill="#3B2415" />
        <circle cx="45.5" cy="35" r="5.2" fill="#3B2415" />
        <rect x="27.1" y="31.1" width="2.7" height="2.7" rx="1.05" fill="#FFFFFF" opacity="0.95" />
        <rect x="46.1" y="31.1" width="2.7" height="2.7" rx="1.05" fill="#FFFFFF" opacity="0.95" />
      </g>
    </g>

    {mood === 'concerned' && (
      <g stroke="#3B2415" strokeWidth="1.9" strokeLinecap="round" opacity="0.85">
        <path d="M21.6 29 L29 26.8" fill="none" />
        <path d="M50.4 29 L43 26.8" fill="none" />
      </g>
    )}

    {/* blush — tucked up under the outer corner of each eye, close enough to
        read as cheeks rather than as two stray dots */}
    <g className="theria-hana-blush">
      <ellipse cx="20.8" cy="41.4" rx="3.9" ry="2.7" fill="#E8455E" />
      <ellipse cx="51.2" cy="41.4" rx="3.9" ry="2.7" fill="#E8455E" />
    </g>

    {/* mouth — small and high, a little curve between the eyes: ( o ‿ o ).
        A wide grin fights the eyes for the face; this leaves them the star. */}
    {mood === 'happy' && (
      <path
        d="M33.7 42.6 Q36 45.4 38.3 42.6"
        stroke="#3B2415"
        strokeWidth="2.1"
        strokeLinecap="round"
        fill="none"
      />
    )}
    {mood === 'neutral' && (
      <path
        d="M34 43.2 Q36 44.7 38 43.2"
        stroke="#3B2415"
        strokeWidth="2.1"
        strokeLinecap="round"
        fill="none"
      />
    )}
    {mood === 'concerned' && (
      <path
        d="M33.9 44.6 Q36 42.2 38.1 44.6"
        stroke="#3B2415"
        strokeWidth="2.1"
        strokeLinecap="round"
        fill="none"
      />
    )}
  </svg>
);
