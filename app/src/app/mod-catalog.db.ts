import {
  tauriInvoke,
  type CatalogDbEntryInput,
  type ModioCatalogDbEntryInput,
} from './tauri.bridge';
import type { ApprovedModDefinition } from './mod.types';
import type { ModioCatalogItem } from './modio-catalog.service';

function toCatalogInput(mod: ApprovedModDefinition): CatalogDbEntryInput {
  return {
    id: mod.id,
    name: mod.name,
    description: mod.description,
    modIoUrl: mod.modIoUrl,
    downloadUrl: mod.downloadUrl,
    baseInstallStepsJson: JSON.stringify(mod.baseInstallSteps),
    optionsJson: JSON.stringify(mod.options),
  };
}

function parseCatalogRow(row: {
  id: string;
  name: string;
  description: string;
  modIoUrl: string;
  downloadUrl: string;
  baseInstallStepsJson: string;
  optionsJson: string;
}): ApprovedModDefinition | null {
  try {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      modIoUrl: row.modIoUrl,
      downloadUrl: row.downloadUrl,
      baseInstallSteps: JSON.parse(
        row.baseInstallStepsJson,
      ) as ApprovedModDefinition['baseInstallSteps'],
      options: JSON.parse(row.optionsJson) as ApprovedModDefinition['options'],
    };
  } catch {
    return null;
  }
}

export async function syncCatalog(
  definitions: ReadonlyArray<ApprovedModDefinition>,
): Promise<void> {
  await tauriInvoke('sync_mod_catalog', {
    entries: definitions.map((definition) => toCatalogInput(definition)),
  });
}

export async function searchCatalog(query: string, limit = 200): Promise<ApprovedModDefinition[]> {
  const rows = await tauriInvoke('search_mod_catalog', { query, limit });
  return rows
    .map((row) => parseCatalogRow(row))
    .filter((row): row is ApprovedModDefinition => Boolean(row));
}

function toModioCatalogInput(item: ModioCatalogItem): ModioCatalogDbEntryInput {
  return {
    modioId: item.id,
    name: item.name,
    summary: item.summary,
    profileUrl: item.profileUrl,
    thumbnailUrl: item.thumbnailUrl,
    downloadUrl: item.downloadUrl,
    modfileId: item.modfileId,
    modfileVersion: item.modfileVersion,
    tagsJson: JSON.stringify(item.tags),
    dateUpdated: item.dateUpdated,
    downloadsTotal: item.downloadsTotal,
    subscribersTotal: item.subscribersTotal,
  };
}

function parseModioTagsJson(tagsJson: string): string[] {
  try {
    const parsed = JSON.parse(tagsJson) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((entry): entry is string => typeof entry === 'string')
      : [];
  } catch {
    return [];
  }
}

export async function syncModioCatalog(items: ReadonlyArray<ModioCatalogItem>): Promise<void> {
  await tauriInvoke('sync_modio_catalog', {
    entries: items.map((item) => toModioCatalogInput(item)),
  });
}

export async function searchModioCatalog(query: string, limit = 2000): Promise<ModioCatalogItem[]> {
  const rows = await tauriInvoke('search_modio_catalog', { query, limit });
  return rows.map((row) => ({
    id: row.modioId,
    name: row.name,
    summary: row.summary,
    profileUrl: row.profileUrl,
    thumbnailUrl: row.thumbnailUrl,
    downloadUrl: row.downloadUrl,
    modfileId: row.modfileId,
    modfileVersion: row.modfileVersion,
    tags: parseModioTagsJson(row.tagsJson),
    dateUpdated: row.dateUpdated,
    downloadsTotal: row.downloadsTotal,
    subscribersTotal: row.subscribersTotal,
  }));
}

export async function saveProfileSelection(
  profileId: string,
  modId: string,
  selectedOptions: Record<string, boolean>,
): Promise<void> {
  await tauriInvoke('upsert_profile_mod_selection', {
    profileId,
    modId,
    selectedOptionsJson: JSON.stringify(selectedOptions),
  });
}

export async function loadProfileSelections(
  profileId: string,
): Promise<Record<string, Record<string, boolean>>> {
  const rows = await tauriInvoke('get_profile_mod_selections', { profileId });
  const map: Record<string, Record<string, boolean>> = {};

  for (const row of rows) {
    try {
      map[row.modId] = JSON.parse(row.selectedOptionsJson) as Record<string, boolean>;
    } catch {
      map[row.modId] = {};
    }
  }

  return map;
}
