import { GoogleAIBackend, getAI, getGenerativeModel, type GenerativeModel } from 'firebase/ai';
import { getFirebaseApp } from './app';

/**
 * A flash-class model: Homi phrases and summarises rather than reasons deeply,
 * so latency and free-tier allowance matter more than raw capability.
 *
 * Kept in one constant because model ids get retired without notice.
 */
export const HOMI_MODEL = 'gemini-flash-latest';

/**
 * Null when Firebase is not configured.
 *
 * Uses the Gemini Developer API backend — the one available on the free Spark
 * plan; the Vertex AI backend requires billing.
 *
 * This is the whole of decision D1: the Gemini API key never reaches the
 * browser because Firebase proxies the call, and App Check attests the request
 * came from us. That satisfies the "credentials stay server-side" requirement
 * without standing up an Express server to hold them.
 */
export function getHomiModel(systemInstruction: string): GenerativeModel | null {
  const app = getFirebaseApp();
  if (!app) return null;

  const ai = getAI(app, { backend: new GoogleAIBackend() });
  return getGenerativeModel(ai, {
    model: HOMI_MODEL,
    systemInstruction,
    generationConfig: {
      // Flash models spend "thinking" tokens from this same budget, so too
      // tight a cap truncates the visible answer mid-sentence.
      maxOutputTokens: 1024,
      temperature: 0.6,
    },
  });
}
