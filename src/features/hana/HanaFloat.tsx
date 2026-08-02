import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, type PanInfo } from 'motion/react';
import { X } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router';
import { useHousehold } from '../../core/state/HouseholdContext';
import { HanaFace } from '../../shared/components/HouseholdBuddy';
import { cn } from '../../shared/lib/cn';
import { pathFor, screenFromPath } from '../../app/routes';
import { hanaSpeechFor } from './hanaLines';
import { useUi } from '../../app/state/uiStore';

/** How long each line stays up before Hana moves on. */
const LINE_DURATION_MS = 8000;
/** Beat before she pipes up after landing on a screen. */
const FIRST_LINE_DELAY_MS = 1200;

/**
 * Hana as a floating companion, mirroring Terry in Finance.
 *
 * She docks bottom-left opposite the FAB, and can be dragged across to the
 * right, where she rises a storey so the two never collide. Tapping her opens
 * the conversation; the screen's tips drift in beside her.
 */
export const HanaFloat: React.FC = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { status } = useHousehold();
  const { hanaSide, setHanaSide, hanaVisible } = useUi();

  const screen = screenFromPath(pathname);
  const speech = hanaSpeechFor(screen, status);

  const [lineIndex, setLineIndex] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  // Dismissing quiets her until she has something new to say.
  const [muted, setMuted] = useState(false);
  // A drag that ends on the bubble still fires its click — swallow that one.
  const draggedRef = useRef(false);

  const speechKey = speech ? `${speech.mood}|${speech.lines.join('|')}` : '';

  useEffect(() => {
    setLineIndex(0);
    setDialogOpen(false);
    setMuted(false);
    if (!speechKey) return;
    const timer = window.setTimeout(() => setDialogOpen(true), FIRST_LINE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [speechKey]);

  useEffect(() => {
    if (!dialogOpen || !speech) return;
    const timer = window.setTimeout(() => {
      if (lineIndex < speech.lines.length - 1) setLineIndex((i) => i + 1);
      else setDialogOpen(false);
    }, LINE_DURATION_MS);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- speechKey stands in for the speech object
  }, [dialogOpen, lineIndex, speechKey]);

  if (!hanaVisible) return null;

  const lines = speech?.lines ?? [];
  const mood = speech?.mood ?? 'happy';
  const safeIndex = lines.length > 0 ? lineIndex % lines.length : 0;
  const showDialog = dialogOpen && !muted && lines.length > 0;

  const advanceLine = () => {
    if (lines.length === 0) return;
    if (safeIndex < lines.length - 1) setLineIndex((i) => i + 1);
    else setDialogOpen(false);
  };

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    setHanaSide(info.point.x < window.innerWidth / 2 ? 'left' : 'right');
  };

  const handleClick = () => {
    if (draggedRef.current) {
      draggedRef.current = false;
      return;
    }
    navigate(pathFor('hana'));
  };

  const onLeft = hanaSide === 'left';

  return (
    <div
      className={cn(
        'fixed z-50',
        onLeft
          ? 'bottom-[calc(6rem+env(safe-area-inset-bottom,0px))] left-4 sm:left-6'
          : // the FAB owns the right dock, so Hana floats a storey above it
            'bottom-[calc(10.5rem+env(safe-area-inset-bottom,0px))] right-4 sm:right-6',
      )}
    >
      {/* Remounting on a side switch resets the drag offset, so she pops into
          her new dock instead of keeping a stale transform. */}
      <motion.div
        key={hanaSide}
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 380, damping: 24 }}
        drag
        dragSnapToOrigin
        dragMomentum={false}
        dragElastic={0.2}
        onDragStart={() => {
          draggedRef.current = true;
        }}
        onDragEnd={handleDragEnd}
        className="relative h-14 w-14"
      >
        <AnimatePresence>
          {showDialog && (
            <motion.div
              key={`${speechKey}-${safeIndex}`}
              role="status"
              initial={{ opacity: 0, y: 6, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.97 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className={cn(
                'absolute bottom-1 w-56 max-w-[calc(100vw-6.5rem)] sm:w-64',
                onLeft ? 'left-full ml-3' : 'right-full mr-3',
              )}
            >
              <div
                role="button"
                tabIndex={0}
                onClick={advanceLine}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') advanceLine();
                }}
                aria-label={`Hana says: ${lines[safeIndex]}. Tap for the next message.`}
                className="relative cursor-pointer rounded-2xl border border-border/50 bg-card px-3 py-2.5 pr-7 shadow-lg"
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMuted(true);
                  }}
                  aria-label="Dismiss Hana's tip"
                  className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground/70 transition-colors hover:bg-muted hover:text-foreground"
                >
                  <X size={11} strokeWidth={2.5} />
                </button>

                <p className="text-[9px] font-bold uppercase tracking-widest text-primary">
                  Hana · Your home buddy
                </p>
                <p className="mt-1 text-[12px] leading-snug text-foreground">{lines[safeIndex]}</p>

                {lines.length > 1 && (
                  <div className="mt-1.5 flex items-center justify-end gap-1">
                    {lines.map((_, i) => (
                      <span
                        key={i}
                        className={`h-1 rounded-full transition-all duration-200 ${
                          i === safeIndex ? 'w-3 bg-primary' : 'w-1 bg-border'
                        }`}
                      />
                    ))}
                  </div>
                )}

                <span
                  aria-hidden
                  className={cn(
                    'absolute bottom-3.5 h-2.5 w-2.5 rotate-45 bg-card',
                    onLeft
                      ? '-left-[5px] border-b border-l border-border/50'
                      : '-right-[5px] border-r border-t border-border/50',
                  )}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* No chrome — Hana herself is the button, floating free. */}
        <motion.button
          type="button"
          onClick={handleClick}
          aria-label="Chat with Hana"
          title="Chat with Hana"
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          className="relative block h-14 w-14 drop-shadow-md"
        >
          <motion.span
            animate={{ y: [0, -3, 0] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
            className="block h-full w-full"
          >
            <HanaFace mood={mood} />
          </motion.span>
        </motion.button>
      </motion.div>
    </div>
  );
};
