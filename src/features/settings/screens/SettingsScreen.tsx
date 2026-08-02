import React from 'react';
import {
  ChevronRight,
  Eye,
  Home as HomeIcon,
  Info,
  LogOut,
  Moon,
  Palette,
  Sparkles,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { signOutUser } from '../../../core/firebase/auth';
import { useAuth } from '../../../core/state/AuthContext';
import { useHousehold } from '../../../core/state/HouseholdContext';
import { useUi } from '../../../app/state/uiStore';
import { HanaFace } from '../../../shared/components/HouseholdBuddy';
import { TheriaCard } from '../../../shared/components/TheriaCard';
import { Button } from '../../../shared/components/ui/button';
import { pathFor } from '../../../app/routes';
import { cn } from '../../../shared/lib/cn';

/**
 * Settings, grouped the way Finance groups them: a household section, an
 * appearance section, then the account.
 *
 * Rows that are not built yet are absent rather than present-and-dead — a
 * settings screen full of switches that do nothing is worse than a short one.
 */

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="space-y-2">
    <h2 className="px-1 text-[0.6875rem] font-semibold uppercase tracking-wide text-muted-foreground">
      {title}
    </h2>
    <TheriaCard size="medium" className="sm:col-span-2">
      <div className="divide-y divide-border">{children}</div>
    </TheriaCard>
  </section>
);

const Row: React.FC<{
  icon: LucideIcon;
  label: string;
  detail?: string;
  onClick?: () => void;
  trailing?: React.ReactNode;
}> = ({ icon: Icon, label, detail, onClick, trailing }) => {
  const content = (
    <>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
        <Icon size={15} className="text-muted-foreground" aria-hidden />
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span className="block text-xs font-medium text-foreground">{label}</span>
        {detail && <span className="block truncate text-[0.6875rem] text-muted-foreground">{detail}</span>}
      </span>
      {trailing ?? (onClick && <ChevronRight size={14} className="shrink-0 text-muted-foreground/60" />)}
    </>
  );

  if (!onClick) return <div className="flex items-center gap-3 py-2.5">{content}</div>;

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 py-2.5 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {content}
    </button>
  );
};

export const SettingsScreen: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { household, role, data } = useHousehold();
  const { hanaVisible, toggleHana } = useUi();

  const memberCount = data.members.filter((m) => m.status === 'ACTIVE').length;
  const isDark = document.documentElement.classList.contains('dark');

  const toggleTheme = () => {
    document.documentElement.classList.toggle('dark');
  };

  return (
    <div className="space-y-6">
      <Section title="Household">
        <Row
          icon={HomeIcon}
          label={household?.name ?? 'No household'}
          detail={household ? `${household.currency} · ${household.timezone}` : undefined}
        />
        <Row
          icon={Users}
          label="Members"
          detail={`${memberCount} active`}
          onClick={() => navigate(pathFor('profile'))}
        />
        <Row
          icon={Eye}
          label="Your role"
          detail={
            role === 'MANAGER'
              ? 'Manager — you can change anything'
              : role === 'OBSERVER'
                ? 'Observer — this household is read-only for you'
                : 'Not a member'
          }
        />
      </Section>

      <Section title="Appearance">
        <Row
          icon={isDark ? Moon : Palette}
          label="Theme"
          detail="Switch between light and dark"
          trailing={
            <Button variant="outline" size="sm" onClick={toggleTheme}>
              {isDark ? 'Light' : 'Dark'}
            </Button>
          }
        />
        <Row
          icon={Sparkles}
          label="Hana"
          detail={hanaVisible ? 'Floating on every screen' : 'Hidden for now'}
          trailing={
            <button
              type="button"
              onClick={toggleHana}
              role="switch"
              aria-checked={hanaVisible}
              aria-label="Show Hana"
              className={cn(
                'relative h-6 w-11 shrink-0 rounded-full transition-colors',
                hanaVisible ? 'bg-primary' : 'bg-muted',
              )}
            >
              <span
                className={cn(
                  'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
                  hanaVisible ? 'translate-x-[1.375rem]' : 'translate-x-0.5',
                )}
              />
            </button>
          }
        />
      </Section>

      <Section title="Account">
        <Row
          icon={Info}
          label={user?.displayName ?? 'Signed in'}
          detail={user?.email ?? undefined}
          onClick={() => navigate(pathFor('profile'))}
        />
        <Row
          icon={LogOut}
          label="Sign out"
          onClick={() => void signOutUser()}
        />
      </Section>

      <div className="flex items-center gap-3 px-1 pb-2">
        <span className="h-10 w-10 shrink-0">
          <HanaFace mood="happy" />
        </span>
        <p className="text-[0.6875rem] leading-relaxed text-muted-foreground">
          Theria Household · © {new Date().getFullYear()}
          <br />
          Sibling to Theria Finance.
        </p>
      </div>
    </div>
  );
};
