import {
  SNOWRUNNER_GAME_ID,
  STEAM_STORE_ID,
  type GameId,
  type StoreId,
} from "./game-discovery.types";

export interface StoreGameSettings {
  installPath: string;
  profileRootPath: string;
}

export type StoreGamesMap = Partial<Record<GameId, StoreGameSettings>>;

export interface StoreSettings {
  games: StoreGamesMap;
}

export type StoresSettingsMap = Partial<Record<StoreId, StoreSettings>>;

export interface AppSettings {
  selectedGameId: GameId;
  selectedStoreId: StoreId;
  autoBackupOnDeploy: boolean;
  stores: StoresSettingsMap;
}

export interface SettingsPatch {
  selectedGameId?: GameId;
  selectedStoreId?: StoreId;
  autoBackupOnDeploy?: boolean;
  stores?: Partial<
    Record<StoreId, { games?: Partial<Record<GameId, Partial<StoreGameSettings>>> }>
  >;
}

export const SETTINGS_STORAGE_KEY = "snowman.settings.v1";

export const DEFAULT_SETTINGS: AppSettings = {
  selectedGameId: SNOWRUNNER_GAME_ID,
  selectedStoreId: STEAM_STORE_ID,
  autoBackupOnDeploy: true,
  stores: {},
};

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function getInstallPathForStore(
  settings: AppSettings,
  storeId: StoreId,
  gameId: GameId,
): string {
  return settings.stores[storeId]?.games[gameId]?.installPath ?? "";
}

export function setInstallPathForStore(
  settings: AppSettings,
  storeId: StoreId,
  gameId: GameId,
  installPath: string,
): AppSettings {
  return mergeSettings(
    {
      stores: {
        [storeId]: {
          games: {
            [gameId]: { installPath },
          },
        },
      },
    },
    settings,
  );
}

export function mergeSettings(patch: SettingsPatch, base: AppSettings): AppSettings {
  const mergedStores: StoresSettingsMap = { ...base.stores };

  if (patch.stores) {
    const patchStores = patch.stores;
    (Object.keys(patchStores) as StoreId[]).forEach((storeId) => {
      const storePatch = patchStores[storeId];
      if (!storePatch) return;

      const baseStore = base.stores[storeId] ?? { games: {} };
      const mergedGames: StoreGamesMap = { ...baseStore.games };

      if (storePatch.games) {
        const patchGames = storePatch.games;
        (Object.keys(patchGames) as GameId[]).forEach((gameId) => {
          const gamePatch = patchGames[gameId];
          if (!gamePatch) return;

          mergedGames[gameId] = {
            installPath: "",
            profileRootPath: "",
            ...baseStore.games[gameId],
            ...gamePatch,
          };
        });
      }

      mergedStores[storeId] = { games: mergedGames };
    });
  }

  return {
    selectedGameId: patch.selectedGameId ?? base.selectedGameId,
    selectedStoreId: patch.selectedStoreId ?? base.selectedStoreId,
    autoBackupOnDeploy: patch.autoBackupOnDeploy ?? base.autoBackupOnDeploy,
    stores: mergedStores,
  };
}

function migrateLegacyShape(parsed: Record<string, unknown>): SettingsPatch {
  const legacyInstallPath =
    typeof parsed["gameInstallPath"] === "string" ? parsed["gameInstallPath"] : undefined;
  const legacyAutoBackup =
    typeof parsed["autoBackupOnDeploy"] === "boolean" ? parsed["autoBackupOnDeploy"] : undefined;

  if (!legacyInstallPath && legacyAutoBackup === undefined) {
    return {};
  }

  return {
    autoBackupOnDeploy: legacyAutoBackup,
    stores: {
      steam: {
        games: {
          snowrunner: {
            installPath: legacyInstallPath ?? "",
          },
        },
      },
    },
  };
}

export function loadSettings(storage: StorageLike): AppSettings {
  const serialized = storage.getItem(SETTINGS_STORAGE_KEY);

  if (!serialized) {
    return DEFAULT_SETTINGS;
  }

  try {
    const parsed = JSON.parse(serialized) as Record<string, unknown>;
    const patch = parsed as SettingsPatch;
    const migrated = migrateLegacyShape(parsed);

    return mergeSettings(patch, mergeSettings(migrated, DEFAULT_SETTINGS));
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(storage: StorageLike, settings: AppSettings): void {
  storage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}
