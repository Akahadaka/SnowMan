export interface ModioCatalogItem {
  id: number;
  name: string;
  summary: string;
  profileUrl: string;
  thumbnailUrl: string;
  downloadUrl: string;
  modfileId: number;
  modfileVersion: string;
  tags: string[];
  dateUpdated: number;
  downloadsTotal: number;
  subscribersTotal: number;
}

export interface FetchModioCatalogParams {
  gameId: number;
  apiKey: string;
  query: string;
  limit?: number;
  offset?: number;
}

interface FetchResponseLike {
  ok: boolean;
  status?: number;
  json: () => Promise<unknown>;
}

type FetchLike = (input: string) => Promise<FetchResponseLike>;

interface ModioTagLike {
  name?: unknown;
}

interface ModioStatsLike {
  downloads_total?: unknown;
  subscribers_total?: unknown;
}

interface ModioRowLike {
  id?: unknown;
  name?: unknown;
  summary?: unknown;
  profile_url?: unknown;
  logo?: unknown;
  modfile?: unknown;
  date_updated?: unknown;
  tags?: unknown;
  stats?: unknown;
}

interface ModioLogoLike {
  thumb_320x180?: unknown;
  thumb_640x360?: unknown;
  original?: unknown;
}

interface ModioDownloadLike {
  binary_url?: unknown;
}

interface ModioModfileLike {
  id?: unknown;
  version?: unknown;
  download?: unknown;
}

interface ModioListPayload {
  data?: unknown;
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function asNumber(value: unknown): number {
  return typeof value === 'number' ? value : Number(value ?? 0);
}

export function buildModioCatalogUrl(params: {
  gameId: number;
  apiKey: string;
  limit?: number;
  offset?: number;
}): string {
  const gameId = params.gameId;
  const limit = params.limit ?? 100;
  const offset = params.offset ?? 0;

  const query = new URLSearchParams({
    api_key: params.apiKey,
    _limit: String(limit),
    _offset: String(offset),
    _sort: '-date_updated',
  });

  return `https://g-${gameId}.modapi.io/v1/games/${gameId}/mods?${query.toString()}`;
}

function normalizeItem(raw: ModioRowLike): ModioCatalogItem {
  const tagsRaw = Array.isArray(raw.tags) ? (raw.tags as ModioTagLike[]) : [];
  const stats = (
    typeof raw.stats === 'object' && raw.stats !== null ? (raw.stats as ModioStatsLike) : {}
  ) as ModioStatsLike;
  const logo =
    typeof raw.logo === 'object' && raw.logo !== null ? (raw.logo as ModioLogoLike) : undefined;
  const modfile =
    typeof raw.modfile === 'object' && raw.modfile !== null
      ? (raw.modfile as ModioModfileLike)
      : undefined;
  const download =
    typeof modfile?.download === 'object' && modfile.download !== null
      ? (modfile.download as ModioDownloadLike)
      : undefined;

  return {
    id: asNumber(raw.id),
    name: asString(raw.name),
    summary: asString(raw.summary),
    profileUrl: asString(raw.profile_url),
    thumbnailUrl: asString(logo?.thumb_320x180) || asString(logo?.thumb_640x360),
    downloadUrl: asString(download?.binary_url),
    modfileId: asNumber(modfile?.id),
    modfileVersion: asString(modfile?.version),
    tags: tagsRaw.map((tag) => asString(tag.name)).filter((tag) => tag.length > 0),
    dateUpdated: asNumber(raw.date_updated),
    downloadsTotal: asNumber(stats.downloads_total),
    subscribersTotal: asNumber(stats.subscribers_total),
  };
}

function filterByQuery(items: ModioCatalogItem[], rawQuery: string): ModioCatalogItem[] {
  const query = rawQuery.trim().toLowerCase();
  if (!query) {
    return items;
  }

  return items.filter((item) => {
    const haystack = [item.name, item.summary, ...item.tags].join(' ').toLowerCase();
    return haystack.includes(query);
  });
}

export async function fetchModioCatalog(
  params: FetchModioCatalogParams,
  fetchFn: FetchLike = (input) => fetch(input),
): Promise<ModioCatalogItem[]> {
  const apiKey = params.apiKey.trim();
  if (!apiKey) {
    return [];
  }

  const url = buildModioCatalogUrl({
    gameId: params.gameId,
    apiKey,
    limit: params.limit,
    offset: params.offset,
  });

  const response = await fetchFn(url);
  if (!response.ok) {
    throw new Error(`mod.io request failed with status ${response.status ?? 'unknown'}`);
  }

  const payload = (await response.json()) as ModioListPayload;
  const rows = Array.isArray(payload?.data) ? (payload.data as ModioRowLike[]) : [];
  const normalized = rows.map((row) => normalizeItem(row));
  return filterByQuery(normalized, params.query);
}
