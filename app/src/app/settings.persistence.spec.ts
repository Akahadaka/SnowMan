import { describe, expect, it } from "vitest";
import {
  DEFAULT_SETTINGS,
  SETTINGS_STORAGE_KEY,
  loadSettings,
  mergeSettings,
  saveSettings,
  type AppSettings,
} from "./settings.persistence";

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
      gameInstallPath: "C:/Games/SnowRunner",
      autoBackupOnDeploy: false,
    };

    saveSettings(storage, settings);
    const loaded = loadSettings(storage);

    expect(storage.getItem(SETTINGS_STORAGE_KEY)).toBeTruthy();
    expect(loaded).toEqual(settings);
  });

  it("merges partial updates with existing values", () => {
    const base: AppSettings = {
      gameInstallPath: "D:/SnowRunner",
      autoBackupOnDeploy: true,
    };

    const merged = mergeSettings({ autoBackupOnDeploy: false }, base);

    expect(merged).toEqual({
      gameInstallPath: "D:/SnowRunner",
      autoBackupOnDeploy: false,
    });
  });
});
