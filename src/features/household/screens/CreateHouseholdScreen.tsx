import React, { useState } from 'react';
import { useHousehold } from '../../../core/state/HouseholdContext';
import { TheriaBrandLogo } from '../../../shared/components/TheriaBrandLogo';
import { Button } from '../../../shared/components/ui/button';
import { Input } from '../../../shared/components/ui/input';

/**
 * First run, step one. Deliberately a single field.
 *
 * The rest of setup — stock, bills, deadlines, members — is offered from the
 * dashboard's empty states rather than a wizard the user has to survive
 * (prompt0.md §10).
 */
export const CreateHouseholdScreen: React.FC = () => {
  const { createHousehold } = useHousehold();
  const [name, setName] = useState('Home');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await createHousehold(name);
    } catch (cause) {
      console.error('[household] creation failed:', cause);
      setError('We could not create your household. Check your connection and try again.');
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <TheriaBrandLogo size="lg" />
          <h1 className="mt-4 text-xl font-semibold text-foreground">Name your household</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            You can invite the rest of the family once it exists.
          </p>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <label htmlFor="household-name" className="sr-only">
            Household name
          </label>
          <Input
            id="household-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Home"
            maxLength={60}
            required
            autoFocus
          />

          {error && (
            <p role="alert" className="text-xs text-status-critical">
              {error}
            </p>
          )}

          <Button type="submit" size="lg" className="w-full" disabled={busy || !name.trim()}>
            {busy ? 'Creating…' : 'Create household'}
          </Button>
        </form>
      </div>
    </div>
  );
};
