import { describe, expect, it, vi } from 'vitest';
import {
  buildModioCatalogUrl,
  fetchModioCatalog,
  type ModioCatalogItem,
} from './modio-catalog.service';

describe('modio catalog service', () => {
  it('builds browse URL with game-specific host and key', () => {
    const url = buildModioCatalogUrl({
      gameId: 306,
      apiKey: 'abc123',
      limit: 50,
      offset: 100,
    });

    expect(url).toContain('https://g-306.modapi.io/v1/games/306/mods');
    expect(url).toContain('api_key=abc123');
    expect(url).toContain('_limit=50');
    expect(url).toContain('_offset=100');
    expect(url).toContain('_sort=-date_updated');
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
            modfile: { download: { binary_url: 'https://cdn.mod.io/real-life-mod.zip' } },
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
        apiKey: 'abc123',
        query: 'manual',
      },
      fetchMock,
    );

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Real Life Mod');
    expect(result[0].thumbnailUrl).toBe('https://cdn.mod.io/thumb-rlm.jpg');
    expect(result[0].downloadUrl).toBe('https://cdn.mod.io/real-life-mod.zip');
    expect(result[0].tags).toContain('Manual');
    expect(result[0].downloadsTotal).toBe(123);
    expect(result[0].subscribersTotal).toBe(45);
  });

  it('returns empty list when API key is missing', async () => {
    const fetchMock = vi.fn();

    const result = await fetchModioCatalog(
      {
        gameId: 306,
        apiKey: '',
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
          apiKey: 'bad-key',
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
        apiKey: 'abc123',
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
      tags: [],
      downloadsTotal: 0,
      subscribersTotal: 0,
    });
  });
});
