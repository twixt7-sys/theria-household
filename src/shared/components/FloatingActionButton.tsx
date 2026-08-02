import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CalendarPlus, ListPlus, PackagePlus, Plus, ReceiptText } from 'lucide-react';
import type { ModalName } from '../../app/state/uiStore';
import { cn } from '../lib/cn';

/**
 * The quick-add button, ported from Finance.
 *
 * On a feature screen it collapses into that screen's single add action, since
 * offering four choices when three of them navigate away is a menu pretending
 * to be a shortcut. Everywhere else it fans out.
 *
 * Hidden entirely for an Observer: the app should read as observational rather
 * than as a wall of disabled buttons (prompt0.md §1.5).
 */

/** When set, the FAB skips the menu and runs one action. */
export type DirectFabAction = {
  label: string;
  onClick: () => void;
  buttonClass: string;
};

interface FabAction {
  icon: React.ElementType;
  label: string;
  modal: ModalName;
  button: string;
}

const ACTIONS: FabAction[] = [
  {
    icon: PackagePlus,
    label: 'Add Stock',
    modal: 'stock',
    button: 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800',
  },
  {
    icon: ReceiptText,
    label: 'Add Bill',
    modal: 'bill',
    button: 'bg-amber-600 hover:bg-amber-700 active:bg-amber-800',
  },
  {
    icon: CalendarPlus,
    label: 'Add Deadline',
    modal: 'deadline',
    button: 'bg-sky-600 hover:bg-sky-700 active:bg-sky-800',
  },
  {
    icon: ListPlus,
    label: 'Add Task',
    modal: 'task',
    button: 'bg-violet-600 hover:bg-violet-700 active:bg-violet-800',
  },
];

export const FloatingActionButton: React.FC<{
  isOpen: boolean;
  onToggle: () => void;
  onSelect: (modal: ModalName) => void;
  directAction?: DirectFabAction | null;
}> = ({ isOpen, onToggle, onSelect, directAction = null }) => {
  const isFabOpen = directAction ? false : isOpen;

  return (
    <>
      <AnimatePresence>
        {isFabOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
            onClick={onToggle}
          />
        )}
      </AnimatePresence>

      <div className="fixed bottom-[calc(6rem+env(safe-area-inset-bottom,0px))] right-4 z-50 flex flex-col items-end sm:right-6">
        <AnimatePresence>
          {isFabOpen && (
            <div className="mb-3 mr-2 flex flex-col items-end gap-2">
              {ACTIONS.map((item, index) => {
                const Icon = item.icon;
                return (
                  <motion.button
                    key={item.label}
                    type="button"
                    initial={{ opacity: 0, y: 12, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 12, scale: 0.95 }}
                    transition={{
                      delay: index * 0.04,
                      type: 'spring',
                      stiffness: 420,
                      damping: 28,
                    }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => onSelect(item.modal)}
                    className="group relative flex items-center gap-2"
                    title={item.label}
                  >
                    <div className="rounded-lg border border-border bg-card px-3 py-1.5 text-[11px] font-medium text-muted-foreground shadow-sm transition-colors group-hover:bg-muted group-hover:text-foreground">
                      {item.label}
                    </div>
                    <div
                      className={cn(
                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white shadow-md transition-colors',
                        item.button,
                      )}
                    >
                      <Icon size={16} />
                    </div>
                  </motion.button>
                );
              })}
            </div>
          )}
        </AnimatePresence>

        <div className="relative flex items-center justify-end">
          <AnimatePresence>
            {directAction && (
              <motion.button
                key={directAction.label}
                type="button"
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                onClick={directAction.onClick}
                className="mr-2 whitespace-nowrap rounded-lg border border-border bg-card px-3 py-1.5 text-[11px] font-medium text-foreground shadow-sm transition-colors hover:bg-muted"
              >
                {directAction.label}
              </motion.button>
            )}
          </AnimatePresence>

          <motion.button
            type="button"
            onClick={directAction ? directAction.onClick : onToggle}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.94 }}
            animate={{ rotate: isFabOpen ? 45 : 0 }}
            transition={{ rotate: { type: 'spring', stiffness: 400, damping: 25 } }}
            className={cn(
              'relative z-[1] flex h-12 w-12 items-center justify-center rounded-full text-white shadow-lg transition-shadow hover:shadow-xl',
              isFabOpen
                ? 'bg-destructive hover:bg-destructive/90'
                : directAction
                  ? directAction.buttonClass
                  : // matches the bottom-nav hexagon gradient
                    'bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-700',
            )}
            aria-label={directAction?.label ?? 'Open quick actions'}
          >
            <Plus size={24} strokeWidth={2.5} />
          </motion.button>
        </div>
      </div>
    </>
  );
};
