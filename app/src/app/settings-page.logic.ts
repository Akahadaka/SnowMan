import type { AppSettings, SettingsPatch } from "./settings.persistence";

export interface SettingsFormValues {
  gameInstallPath: string;
  autoBackupOnDeploy: boolean;
}

export function createInitialSettingsForm(settings: AppSettings): SettingsFormValues {
  return {
    gameInstallPath: settings.gameInstallPath,
    autoBackupOnDeploy: settings.autoBackupOnDeploy,
  };
}

export function toSettingsPayload(values: SettingsFormValues): AppSettings {
  return {
    gameInstallPath: values.gameInstallPath.trim(),
    autoBackupOnDeploy: values.autoBackupOnDeploy,
  };
}

export function applySettingsPatch(
  values: SettingsFormValues,
  patch: SettingsPatch,
): SettingsFormValues {
  return {
    ...values,
    ...patch,
  };
}
