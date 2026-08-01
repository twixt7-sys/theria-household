import React, { useState } from 'react';
import { registerWithEmail, signInWithEmail, signInWithGoogle } from '../../../core/firebase/auth';
import { isFirebaseConfigured } from '../../../core/firebase/config';
import { TheriaBrandLogo } from '../../../shared/components/TheriaBrandLogo';
import { Button } from '../../../shared/components/ui/button';
import { Input } from '../../../shared/components/ui/input';

type Mode = 'signin' | 'register';

/** Full-screen, outside the app chrome — matching Finance's /auth route. */
export const AuthScreen: React.FC = () => {
  const [mode, setMode] = useState<Mode>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setBusy(true);

    const result =
      mode === 'signin'
        ? await signInWithEmail(email, password)
        : await registerWithEmail(email, password, name);

    setBusy(false);
    if (!result.ok) setError(result.message);
    // On success AuthContext's listener takes over and the router re-renders.
  };

  const google = async () => {
    setError(null);
    setBusy(true);
    const result = await signInWithGoogle();
    setBusy(false);
    if (!result.ok) setError(result.message);
  };

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-splash-canvas px-6 py-12">
      {/* Ambient wash, echoing Finance's splash treatment. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(60% 40% at 50% 20%, rgba(16,185,129,0.18), transparent 70%), radial-gradient(50% 35% at 20% 85%, rgba(13,148,136,0.10), transparent 70%)',
        }}
      />

      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <TheriaBrandLogo size="lg" />
          <h1 className="mt-4 text-lg font-bold uppercase tracking-[0.2em] text-white">Theria</h1>
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-primary">Household</p>
          <p className="mt-3 text-sm text-white/60">
            See the state of your home at a glance.
          </p>
        </div>

        {!isFirebaseConfigured ? (
          <div className="rounded-2xl border border-status-warning/30 bg-status-warning-soft p-4 text-xs text-status-warning">
            This app has not been connected to Firebase yet. Copy{' '}
            <code className="font-mono">.env.example</code> to{' '}
            <code className="font-mono">.env</code> and fill in your project's config.
          </div>
        ) : (
          <>
            <form onSubmit={submit} className="space-y-3">
              {mode === 'register' && (
                <div>
                  <label htmlFor="name" className="sr-only">
                    Your name
                  </label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    autoComplete="name"
                    required
                  />
                </div>
              )}

              <div>
                <label htmlFor="email" className="sr-only">
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email"
                  autoComplete="email"
                  required
                />
              </div>

              <div>
                <label htmlFor="password" className="sr-only">
                  Password
                </label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  required
                  minLength={6}
                />
              </div>

              {error && (
                <p role="alert" className="text-xs text-status-critical">
                  {error}
                </p>
              )}

              <Button type="submit" size="lg" className="w-full" disabled={busy}>
                {busy ? 'Just a moment…' : mode === 'signin' ? 'Sign in' : 'Create account'}
              </Button>
            </form>

            <div className="my-4 flex items-center gap-3">
              <span className="h-px flex-1 bg-white/10" />
              <span className="text-[0.6875rem] uppercase tracking-wide text-white/40">or</span>
              <span className="h-px flex-1 bg-white/10" />
            </div>

            <Button
              variant="outline"
              size="lg"
              className="w-full border-white/15 text-white hover:bg-white/5"
              onClick={google}
              disabled={busy}
            >
              Continue with Google
            </Button>

            <p className="mt-6 text-center text-xs text-white/50">
              {mode === 'signin' ? "Don't have an account?" : 'Already have an account?'}{' '}
              <button
                type="button"
                onClick={() => {
                  setMode(mode === 'signin' ? 'register' : 'signin');
                  setError(null);
                }}
                className="font-semibold text-primary hover:underline"
              >
                {mode === 'signin' ? 'Create one' : 'Sign in'}
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  );
};
