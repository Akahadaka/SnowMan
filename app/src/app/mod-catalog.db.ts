import { tauriInvoke, type CatalogDbEntryInput } from "./tauri.bridge";
import type { ApprovedModDefinition } from "./mod.types";

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
      ) as ApprovedModDefinition["baseInstallSteps"],
      options: JSON.parse(row.optionsJson) as ApprovedModDefinition["options"],
    };
  } catch {
    return null;
  }
}

export async function syncCatalog(
  definitions: ReadonlyArray<ApprovedModDefinition>,
): Promise<void> {
  await tauriInvoke("sync_mod_catalog", {
    entries: definitions.map((definition) => toCatalogInput(definition)),
  });
}

export async function searchCatalog(query: string, limit = 200): Promise<ApprovedModDefinition[]> {
  const rows = await tauriInvoke("search_mod_catalog", { query, limit });
  return rows
    .map((row) => parseCatalogRow(row))
    .filter((row): row is ApprovedModDefinition => Boolean(row));
}

export async function saveProfileSelection(
  profileId: string,
  modId: string,
  selectedOptions: Record<string, boolean>,
): Promise<void> {
  await tauriInvoke("upsert_profile_mod_selection", {
    profileId,
    modId,
    selectedOptionsJson: JSON.stringify(selectedOptions),
  });
}

export async function loadProfileSelections(
  profileId: string,
): Promise<Record<string, Record<string, boolean>>> {
  const rows = await tauriInvoke("get_profile_mod_selections", { profileId });
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
