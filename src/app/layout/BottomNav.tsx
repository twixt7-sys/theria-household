import React from 'react';
import { Home } from 'lucide-react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router';
import { NAV_ITEMS, pathFor, type NavItem, type Screen } from '../routes';

/**
 * Theria's signature chrome, carried over from Finance unchanged: a clip-path
 * hexagon Home button that lifts and scales when active, flanked by two wings.
 */

const NavButton: React.FC<{ item: NavItem; isActive: boolean; onClick: () => void }> = ({
  item,
  isActive,
  onClick,
}) => {
  const Icon = item.icon;
  return (
    <button
      onClick={onClick}
      aria-label={item.label}
      aria-current={isActive ? 'page' : undefined}
      className={`relative flex flex-col items-center gap-1 rounded-xl p-2 transition-all ${
        isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'
      }`}
    >
      <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
      {isActive && (
        <motion.div
          layoutId="nav-dot"
          className="absolute -bottom-1 h-1 w-1 rounded-full bg-current"
        />
      )}
    </button>
  );
};

export const BottomNav: React.FC<{ screen: Screen }> = ({ screen }) => {
  const navigate = useNavigate();

  const homeIndex = NAV_ITEMS.findIndex((item) => item.id === 'home');
  const leftWing = NAV_ITEMS.slice(0, homeIndex);
  const rightWing = NAV_ITEMS.slice(homeIndex + 1);
  const atHome = screen === 'home';

  const go = (target: Screen) => () => navigate(pathFor(target));

  return (
    <nav
      aria-label="Primary"
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/90 shadow-[0_-14px_28px_-10px_rgba(148,163,184,0.55)] backdrop-blur-md dark:shadow-[0_-14px_28px_-10px_rgba(0,0,0,0.45)]"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -top-20 left-0 right-0 h-20 bg-gradient-to-t from-slate-300/55 via-slate-200/25 to-transparent dark:from-black/35 dark:via-black/20 dark:to-transparent"
      />
      <div className="relative mx-auto max-w-7xl px-2 pb-safe pt-2 sm:px-4 lg:px-6">
        <div className="flex items-end justify-between">
          <div className="mb-2 flex max-w-md flex-1 items-center justify-around">
            {leftWing.map((item) => (
              <NavButton
                key={item.id}
                item={item}
                isActive={screen === item.id}
                onClick={go(item.id)}
              />
            ))}
          </div>

          <div
            className="relative flex flex-shrink-0 -translate-y-1 flex-col items-center px-4 transition-all duration-300 ease-out"
            style={{ transform: atHome ? 'translateY(-1.80rem) scale(1.15)' : 'translateY(0)' }}
          >
            <button
              onClick={go('home')}
              aria-label="Home"
              aria-current={atHome ? 'page' : undefined}
              className={`hexagon group relative flex h-12 w-12 items-center justify-center transition-all duration-300 ${
                atHome ? 'active scale-110 text-white' : 'text-muted-foreground hover:scale-105'
              }`}
            >
              <Home size={20} strokeWidth={2} className="relative z-10" />
            </button>
            {atHome && (
              <div className="absolute -bottom-2 h-4 w-12 animate-pulse rounded-full bg-green-500/30 blur-lg" />
            )}
          </div>

          <div className="mb-2 flex max-w-md flex-1 items-center justify-around">
            {rightWing.map((item) => (
              <NavButton
                key={item.id}
                item={item}
                isActive={screen === item.id}
                onClick={go(item.id)}
              />
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
};
