import React, { useMemo, useRef, useState } from 'react';
import { Send } from 'lucide-react';
import { getHomiModel } from '../../../core/firebase/ai';
import { formatQuantity } from '../../../core/domain/units';
import { useHousehold } from '../../../core/state/HouseholdContext';
import { HanaFace } from '../../../shared/components/HouseholdBuddy';
import { Button } from '../../../shared/components/ui/button';
import { Input } from '../../../shared/components/ui/input';
import { cn } from '../../../shared/lib/cn';

/**
 * Talking to Hana.
 *
 * The grounding rule is absolute (prompt0.md §11.4): every number Hana says
 * comes from the snapshot built here, out of `householdStatus` — the same
 * source the dashboard renders. She phrases; she never computes, and she never
 * invents an item that is not in the snapshot.
 *
 * When the model is unavailable she degrades to the deterministic summary
 * rather than apologising for a missing service (§11.7).
 */

interface Message {
  id: string;
  from: 'user' | 'hana';
  text: string;
}

const SYSTEM_INSTRUCTION = `You are Hana, the companion inside Theria: Household — a home operations app.

Rules you must never break:
- Only ever discuss the household snapshot given to you. If something is not in it, say you do not have that information.
- Never invent, estimate or calculate numbers. Every figure you mention must appear verbatim in the snapshot.
- Keep replies to two or three short sentences. You are warm and calm, never chirpy or alarming.
- If the household is fine, say so plainly instead of manufacturing something to report.`;

export const HanaScreen: React.FC = () => {
  const { household, data, status } = useHousehold();
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [thinking, setThinking] = useState(false);
  const idRef = useRef(0);

  /** Everything Hana is allowed to know, and nothing else. */
  const snapshot = useMemo(() => {
    const stock = data.stockItems
      .filter((item) => item.active)
      .map((item) => `- ${item.name}: ${formatQuantity(item.quantity, item.unit)}`)
      .join('\n');

    const critical = status.criticalItems.map((i) => `- ${i.label}: ${i.detail}`).join('\n');
    const attention = status.attentionItems.map((i) => `- ${i.label}: ${i.detail}`).join('\n');
    const changes = status.recentChanges.map((c) => `- ${c.label} ${c.detail}`).join('\n');

    return [
      `Household: ${household?.name ?? 'Home'}`,
      `Overall: ${status.overallStatus}`,
      `Summary: ${status.summary}`,
      critical ? `Needs attention now:\n${critical}` : 'Nothing is critical.',
      attention ? `Keep an eye on:\n${attention}` : '',
      stock ? `Stock levels:\n${stock}` : 'No stock is being tracked yet.',
      changes ? `Recent changes:\n${changes}` : '',
    ]
      .filter(Boolean)
      .join('\n\n');
  }, [household, data.stockItems, status]);

  const suggestions = useMemo(
    () => [
      'How is the house doing?',
      'What needs attention?',
      'What changed recently?',
      'What is running low?',
    ],
    [],
  );

  const send = async (text: string) => {
    const question = text.trim();
    if (!question || thinking) return;

    idRef.current += 1;
    const userMessage: Message = { id: `u${idRef.current}`, from: 'user', text: question };
    setMessages((current) => [...current, userMessage]);
    setDraft('');
    setThinking(true);

    const reply = (answer: string) => {
      idRef.current += 1;
      setMessages((current) => [...current, { id: `h${idRef.current}`, from: 'hana', text: answer }]);
    };

    try {
      const model = getHomiModel(SYSTEM_INSTRUCTION);
      if (!model) {
        // No model configured: the deterministic summary is still true.
        reply(status.summary);
        return;
      }

      const result = await model.generateContent(
        `Here is the household snapshot:\n\n${snapshot}\n\nThe question: ${question}`,
      );
      reply(result.response.text().trim() || status.summary);
    } catch (cause) {
      console.error('[hana] could not reach the model:', cause);
      // Degrade to what is known for certain rather than to an error.
      reply(`${status.summary} I could not reach my usual words just now, but that much is certain.`);
    } finally {
      setThinking(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pb-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center px-6 py-8 text-center">
            <span className="h-24 w-24">
              <HanaFace mood={status.overallStatus === 'GOOD' ? 'happy' : 'concerned'} />
            </span>
            <h2 className="mt-3 text-sm font-semibold text-foreground">Hana</h2>
            <p className="mt-1 max-w-xs text-xs leading-relaxed text-muted-foreground">
              {status.summary} Ask me anything about the house — I only speak from what Theria
              actually knows.
            </p>

            <div className="mt-5 grid w-full max-w-sm grid-cols-1 gap-2 sm:grid-cols-2">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => void send(suggestion)}
                  className="rounded-xl border border-border bg-card px-3 py-2 text-xs text-foreground transition-colors hover:border-primary/40 hover:bg-primary/5"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={cn('flex gap-2', message.from === 'user' ? 'justify-end' : 'justify-start')}
          >
            {message.from === 'hana' && (
              <span className="mt-0.5 h-8 w-8 shrink-0">
                <HanaFace mood="happy" />
              </span>
            )}
            <div
              className={cn(
                'max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
                message.from === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'border border-border bg-card text-foreground',
              )}
            >
              {message.text}
            </div>
          </div>
        ))}

        {thinking && (
          <div className="flex items-center gap-2">
            <span className="h-8 w-8 shrink-0">
              <HanaFace mood="neutral" />
            </span>
            <div className="rounded-2xl border border-border bg-card px-3.5 py-2.5">
              <span className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </span>
            </div>
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send(draft);
        }}
        className="flex shrink-0 items-center gap-2 border-t border-border pt-3"
      >
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Ask Hana about your home"
          aria-label="Ask Hana about your home"
        />
        <Button type="submit" size="icon" disabled={!draft.trim() || thinking} aria-label="Send">
          <Send size={16} />
        </Button>
      </form>
    </div>
  );
};
