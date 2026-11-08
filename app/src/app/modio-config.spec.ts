import { afterEach, describe, expect, it } from 'vitest';
import { getModioApiKey } from './modio-config';

type GlobalWithModioKey = typeof globalThis & { MODIO_API_KEY?: unknown };

describe('modio-config', () => {
  afterEach(() => {
    delete (globalThis as GlobalWithModioKey).MODIO_API_KEY;
  });

  it('returns an empty string when no key is configured', () => {
    expect(getModioApiKey()).toBe('');
  });

  it('returns the trimmed key injected by modio-config.local.js', () => {
    (globalThis as GlobalWithModioKey).MODIO_API_KEY = '  abc123  ';
    expect(getModioApiKey()).toBe('abc123');
  });

  it('ignores non-string values', () => {
    (globalThis as GlobalWithModioKey).MODIO_API_KEY = 42;
    expect(getModioApiKey()).toBe('');
  });
});
