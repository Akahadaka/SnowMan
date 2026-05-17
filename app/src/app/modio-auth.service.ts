interface FetchResponseLike {
  ok: boolean;
  status?: number;
  json: () => Promise<unknown>;
}

type FetchLike = (input: string, init?: RequestInit) => Promise<FetchResponseLike>;

interface TokenPayload {
  access_token?: unknown;
}

function emailRequestUrl(gameId: number): string {
  return `https://g-${gameId}.modapi.io/v1/oauth/emailrequest`;
}

function emailExchangeUrl(gameId: number): string {
  return `https://g-${gameId}.modapi.io/v1/oauth/emailexchange`;
}

export async function requestEmailCode(
  email: string,
  gameId: number,
  fetchFn: FetchLike = (input, init) => fetch(input, init),
): Promise<void> {
  const body = new URLSearchParams({ email });

  const response = await fetchFn(emailRequestUrl(gameId), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!response.ok) {
    throw new Error(`mod.io email request failed with status ${response.status ?? 'unknown'}`);
  }
}

export async function exchangeEmailCode(
  email: string,
  securityCode: string,
  gameId: number,
  fetchFn: FetchLike = (input, init) => fetch(input, init),
): Promise<string> {
  const body = new URLSearchParams({ email, security_code: securityCode });

  const response = await fetchFn(emailExchangeUrl(gameId), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!response.ok) {
    throw new Error(`mod.io email exchange failed with status ${response.status ?? 'unknown'}`);
  }

  const payload = (await response.json()) as TokenPayload;
  if (typeof payload.access_token !== 'string' || !payload.access_token) {
    throw new Error('mod.io response missing access_token');
  }

  return payload.access_token;
}
