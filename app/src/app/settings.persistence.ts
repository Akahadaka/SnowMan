import { SNOWRUNNER_GAME_ID, type GameId } from "./game-discovery.types";

export interface GameSettings {
  installPath: string;
  profileRootPath: string;
}

export type GamesSettingsMap = Record<GameId, GameSettings>;

export interface AppSettings {
  selectedGameId: GameId;
  autoBackupOnDeploy: boolean;
  games: GamesSettingsMap;
}

export interface SettingsPatch {
  selectedGameId?: GameId;
  autoBackupOnDeploy?: boolean;
  games?: Partial<Record<GameId, Partial<GameSettings>>>;
}

export const SETTINGS_STORAGE_KEY = "snowman.settings.v1";

export const DEFAULT_SETTINGS: AppSettings = {
  selectedGameId: SNOWRUNNER_GAME_ID,
  autoBackupOnDeploy: true,
  games: {
    snowrunner: {
      installPath: "",
      profileRootPath: "",
    },
  },
};

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function getInstallPathForGame(settings: AppSettings, gameId: GameId): string {
  return settings.games[gameId].installPath;
}

export function setInstallPathForGame(
  settings: AppSettings,
  gameId: GameId,
  installPath: string,
): AppSettings {
  return mergeSettings(
    {
      games: {
        [gameId]: {
          installPath,
        },
      },
    },
    settings,
  );
}

export function mergeSettings(patch: SettingsPatch, base: AppSettings): AppSettings {
  return {
    selectedGameId: patch.selectedGameId ?? base.selectedGameId,
    autoBackupOnDeploy: patch.autoBackupOnDeploy ?? base.autoBackupOnDeploy,
    games: {
      snowrunner: {
        ...base.games.snowrunner,
        ...(patch.games?.snowrunner ?? {}),
      },
    },
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
    games: {
      snowrunner: {
        installPath: legacyInstallPath ?? "",
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
