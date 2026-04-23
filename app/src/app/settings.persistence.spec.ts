import { describe, expect, it } from "vitest";
import {
  DEFAULT_SETTINGS,
  SETTINGS_STORAGE_KEY,
  getInstallPathForStore,
  loadSettings,
  mergeSettings,
  saveSettings,
  type AppSettings,
} from "./settings.persistence";
import { SNOWRUNNER_GAME_ID, STEAM_STORE_ID } from "./game-discovery.types";

class MemoryStorage implements Storage {
  private readonly data = new Map<string, string>();
  length = 0;

  clear(): void {
    this.data.clear();
    this.length = 0;
  }

  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }

  key(index: number): string | null {
    return Array.from(this.data.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.data.delete(key);
    this.length = this.data.size;
  }

  setItem(key: string, value: string): void {
    this.data.set(key, value);
    this.length = this.data.size;
  }
}

describe("settings persistence", () => {
  it("returns defaults when storage is empty", () => {
    const storage = new MemoryStorage();

    const loaded = loadSettings(storage);

    expect(loaded).toEqual(DEFAULT_SETTINGS);
  });

  it("writes and reads settings using the storage key", () => {
    const storage = new MemoryStorage();
    const settings: AppSettings = {
      selectedGameId: SNOWRUNNER_GAME_ID,
      selectedStoreId: STEAM_STORE_ID,
      autoBackupOnDeploy: false,
      onboardingComplete: false,
      stores: {
        steam: {
          games: {
            snowrunner: {
              installPath: "C:/Games/SnowRunner",
              profileRootPath: "C:/Users/bravo/Documents/SnowMan/profiles/snowrunner",
            },
          },
        },
      },
    };

    saveSettings(storage, settings);
    const loaded = loadSettings(storage);

    expect(storage.getItem(SETTINGS_STORAGE_KEY)).toBeTruthy();
    expect(loaded).toEqual(settings);
  });

  it("merges partial updates with existing values", () => {
    const base: AppSettings = {
      selectedGameId: SNOWRUNNER_GAME_ID,
      selectedStoreId: STEAM_STORE_ID,
      autoBackupOnDeploy: true,
      stores: {
        steam: {
          games: {
            snowrunner: {
              installPath: "D:/SnowRunner",
              profileRootPath: "D:/SnowRunner/profiles",
            },
          },
        },
      },
    };

    const merged = mergeSettings(
      {
        autoBackupOnDeploy: false,
        stores: {
          steam: {
            games: {
              snowrunner: {
                installPath: "E:/SnowRunner",
              },
            },
          },
        },
      },
      base,
    );

    expect(merged).toEqual({
      selectedGameId: SNOWRUNNER_GAME_ID,
      selectedStoreId: STEAM_STORE_ID,
      autoBackupOnDeploy: false,
      stores: {
        steam: {
          games: {
            snowrunner: {
              installPath: "E:/SnowRunner",
              profileRootPath: "D:/SnowRunner/profiles",
            },
          },
        },
      },
    });
  });

  it("migrates legacy top-level gameInstallPath into snowrunner namespaced settings", () => {
    const storage = new MemoryStorage();
    storage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({
        gameInstallPath: "C:/Legacy/SnowRunner",
        autoBackupOnDeploy: true,
      }),
    );

    const loaded = loadSettings(storage);

    expect(getInstallPathForStore(loaded, STEAM_STORE_ID, SNOWRUNNER_GAME_ID)).toBe(
      "C:/Legacy/SnowRunner",
    );
    expect(loaded.selectedGameId).toBe(SNOWRUNNER_GAME_ID);
  });
});
