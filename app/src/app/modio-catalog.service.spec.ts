import { describe, expect, it, vi } from 'vitest';
import {
  buildModioCatalogUrl,
  fetchAllModioCatalog,
  fetchModioCatalog,
  type ModioCatalogItem,
} from './modio-catalog.service';

describe('modio catalog service', () => {
  it('builds browse URL with game-specific host and pagination params', () => {
    const url = buildModioCatalogUrl({
      gameId: 306,
      limit: 50,
      offset: 100,
    });

    expect(url).toContain('https://g-306.modapi.io/v1/games/306/mods');
    expect(url).toContain('_limit=50');
    expect(url).toContain('_offset=100');
    expect(url).toContain('_sort=-date_updated');
    expect(url).not.toContain('api_key');
  });

  it('sends Authorization header when fetching catalog', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] }),
    });

    await fetchModioCatalog({ gameId: 306, accessToken: 'tok_abc', query: '' }, fetchMock);

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((init?.headers as Record<string, string>)?.['Authorization']).toBe('Bearer tok_abc');
  });

  it('maps API rows into catalog items and filters by search text', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          {
            id: 182067,
            name: 'Real Life Mod',
            summary: 'Manual install gameplay overhaul',
            profile_url: 'https://mod.io/g/snowrunner/m/real-life-mod',
            logo: { thumb_320x180: 'https://cdn.mod.io/thumb-rlm.jpg' },
            modfile: {
              id: 7624356,
              version: '2.0.0',
              download: { binary_url: 'https://cdn.mod.io/real-life-mod.zip' },
            },
            date_updated: 1700000000,
            tags: [{ name: 'Manual' }, { name: 'Physics' }],
            stats: { downloads_total: 123, subscribers_total: 45 },
          },
          {
            id: 999,
            name: 'Cargo Tweaks',
            summary: 'Small cargo changes',
            profile_url: 'https://mod.io/g/snowrunner/m/cargo-tweaks',
            date_updated: 1700000010,
            tags: [{ name: 'Gameplay' }],
            stats: { downloads_total: 11, subscribers_total: 2 },
          },
        ],
      }),
    });

    const result = await fetchModioCatalog(
      {
        gameId: 306,
        accessToken: 'tok_abc',
        query: 'manual',
      },
      fetchMock,
    );

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Real Life Mod');
    expect(result[0].thumbnailUrl).toBe('https://cdn.mod.io/thumb-rlm.jpg');
    expect(result[0].downloadUrl).toBe('https://cdn.mod.io/real-life-mod.zip');
    expect(result[0].modfileId).toBe(7624356);
    expect(result[0].modfileVersion).toBe('2.0.0');
    expect(result[0].tags).toContain('Manual');
    expect(result[0].downloadsTotal).toBe(123);
    expect(result[0].subscribersTotal).toBe(45);
  });

  it('returns empty list when access token is missing', async () => {
    const fetchMock = vi.fn();

    const result = await fetchModioCatalog(
      {
        gameId: 306,
        accessToken: '',
        query: '',
      },
      fetchMock,
    );

    expect(result).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('throws on non-ok HTTP response', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
    });

    await expect(
      fetchModioCatalog(
        {
          gameId: 306,
          accessToken: 'bad-token',
          query: '',
        },
        fetchMock,
      ),
    ).rejects.toThrow(/mod.io request failed/i);
  });

  it('keeps deterministic shape when optional fields are missing', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ id: 1, name: 'X' }] }),
    });

    const result: ModioCatalogItem[] = await fetchModioCatalog(
      {
        gameId: 306,
        accessToken: 'tok_abc',
        query: '',
      },
      fetchMock,
    );

    expect(result[0]).toMatchObject({
      id: 1,
      name: 'X',
      summary: '',
      profileUrl: '',
      thumbnailUrl: '',
      downloadUrl: '',
      modfileId: 0,
      modfileVersion: '',
      tags: [],
      downloadsTotal: 0,
      subscribersTotal: 0,
    });
  });

  it('fetches multiple pages until a short page is returned', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            { id: 1, name: 'A', profile_url: 'https://mod.io/a' },
            { id: 2, name: 'B', profile_url: 'https://mod.io/b' },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [{ id: 3, name: 'C', profile_url: 'https://mod.io/c' }],
        }),
      });

    const items = await fetchAllModioCatalog(
      {
        gameId: 306,
        accessToken: 'tok_abc',
        pageSize: 2,
      },
      fetchMock,
    );

    expect(items.map((item) => item.id)).toEqual([1, 2, 3]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
