/**
 * mod.io game API key, injected at runtime by the gitignored `src/modio-config.local.js`
 * (see `src/modio-config.local.example.js`). mod.io's email OAuth endpoints reject requests
 * without it, so it is required to sign in. It ships inside the client, so treat it as public.
 */
type GlobalWithModioKey = typeof globalThis & { MODIO_API_KEY?: unknown };

export function getModioApiKey(): string {
  const key = (globalThis as GlobalWithModioKey).MODIO_API_KEY;
  return typeof key === 'string' ? key.trim() : '';
}
