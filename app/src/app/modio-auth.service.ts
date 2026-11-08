interface FetchResponseLike {
  ok: boolean;
  status?: number;
  json: () => Promise<unknown>;
}

type FetchLike = (input: string, init?: RequestInit) => Promise<FetchResponseLike>;

interface TokenPayload {
  access_token?: unknown;
}

type EmailAuthEndpoint = 'emailrequest' | 'emailexchange';

const defaultFetch: FetchLike = (input, init) => fetch(input, init);

function emailAuthUrl(gameId: number, endpoint: EmailAuthEndpoint): string {
  return `https://g-${gameId}.modapi.io/v1/oauth/${endpoint}`;
}

/**
 * POSTs a form to a mod.io email auth endpoint. mod.io requires the game API key on these
 * calls (401, error_ref 11000 without it), so fail fast locally when it is not configured.
 */
async function postEmailAuth(
  endpoint: EmailAuthEndpoint,
  gameId: number,
  apiKey: string,
  fields: Record<string, string>,
  fetchFn: FetchLike,
): Promise<FetchResponseLike> {
  const key = apiKey.trim();
  if (!key) {
    throw new Error('mod.io API key is not configured for this build.');
  }

  const body = new URLSearchParams({ ...fields, api_key: key });
  const response = await fetchFn(emailAuthUrl(gameId, endpoint), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!response.ok) {
    throw new Error(`mod.io ${endpoint} failed with status ${response.status ?? 'unknown'}`);
  }

  return response;
}

export async function requestEmailCode(
  email: string,
  gameId: number,
  apiKey: string,
  fetchFn: FetchLike = defaultFetch,
): Promise<void> {
  await postEmailAuth('emailrequest', gameId, apiKey, { email }, fetchFn);
}

export async function exchangeEmailCode(
  email: string,
  securityCode: string,
  gameId: number,
  apiKey: string,
  fetchFn: FetchLike = defaultFetch,
): Promise<string> {
  const response = await postEmailAuth(
    'emailexchange',
    gameId,
    apiKey,
    { email, security_code: securityCode },
    fetchFn,
  );

  const payload = (await response.json()) as TokenPayload;
  if (typeof payload.access_token !== 'string' || !payload.access_token) {
    throw new Error('mod.io response missing access_token');
  }

  return payload.access_token;
}
