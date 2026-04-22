export interface AppSettings {
  gameInstallPath: string;
  autoBackupOnDeploy: boolean;
}

export type SettingsPatch = Partial<AppSettings>;

export const SETTINGS_STORAGE_KEY = "snowman.settings.v1";

export const DEFAULT_SETTINGS: AppSettings = {
  gameInstallPath: "",
  autoBackupOnDeploy: true,
};

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function mergeSettings(patch: SettingsPatch, base: AppSettings): AppSettings {
  return {
    ...base,
    ...patch,
  };
}

export function loadSettings(storage: StorageLike): AppSettings {
  const serialized = storage.getItem(SETTINGS_STORAGE_KEY);

  if (!serialized) {
    return DEFAULT_SETTINGS;
  }

  try {
    const parsed = JSON.parse(serialized) as Partial<AppSettings>;
    return mergeSettings(parsed, DEFAULT_SETTINGS);
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(storage: StorageLike, settings: AppSettings): void {
  storage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}
