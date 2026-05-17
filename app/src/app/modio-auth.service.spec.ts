import { describe, expect, it, vi } from 'vitest';
import { exchangeEmailCode, requestEmailCode } from './modio-auth.service';

const GAME_ID = 306;
const API_KEY = 'test-api-key';

function makeFetch(status: number, body: unknown) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  });
}

describe('modio-auth service', () => {
  describe('requestEmailCode', () => {
    it('posts to the email request endpoint with email and api_key', async () => {
      const fetchFn = makeFetch(200, {});
      await requestEmailCode('user@example.com', API_KEY, GAME_ID, fetchFn);

      expect(fetchFn).toHaveBeenCalledOnce();
      const [url, options] = fetchFn.mock.calls[0] as [string, RequestInit];
      expect(url).toContain(`g-${GAME_ID}.modapi.io`);
      expect(url).toContain('emailrequest');
      expect(options.method).toBe('POST');
      const body = new URLSearchParams(options.body as string);
      expect(body.get('email')).toBe('user@example.com');
      expect(body.get('api_key')).toBe(API_KEY);
    });

    it('throws when the response is not ok', async () => {
      const fetchFn = makeFetch(401, { error: { message: 'Invalid key' } });
      await expect(requestEmailCode('user@example.com', API_KEY, GAME_ID, fetchFn)).rejects.toThrow(
        '401',
      );
    });
  });

  describe('exchangeEmailCode', () => {
    it('posts the security code and returns the access token', async () => {
      const fetchFn = makeFetch(200, { access_token: 'tok_abc123' });
      const token = await exchangeEmailCode(
        'user@example.com',
        '123456',
        API_KEY,
        GAME_ID,
        fetchFn,
      );

      expect(token).toBe('tok_abc123');
      const [url, options] = fetchFn.mock.calls[0] as [string, RequestInit];
      expect(url).toContain('emailexchange');
      expect(options.method).toBe('POST');
      const body = new URLSearchParams(options.body as string);
      expect(body.get('security_code')).toBe('123456');
      expect(body.get('api_key')).toBe(API_KEY);
    });

    it('throws when the security code is invalid', async () => {
      const fetchFn = makeFetch(401, { error: { message: 'Invalid code' } });
      await expect(
        exchangeEmailCode('user@example.com', 'wrong', API_KEY, GAME_ID, fetchFn),
      ).rejects.toThrow('401');
    });

    it('throws when access_token is missing from the response', async () => {
      const fetchFn = makeFetch(200, {});
      await expect(
        exchangeEmailCode('user@example.com', '123456', API_KEY, GAME_ID, fetchFn),
      ).rejects.toThrow('access_token');
    });
  });
});
