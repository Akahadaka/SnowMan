import {
  getInstallPathForGame,
  mergeSettings,
  setInstallPathForGame,
  type AppSettings,
} from "./settings.persistence";

export interface SettingsFormValues {
  gameInstallPath: string;
  autoBackupOnDeploy: boolean;
}

export function createInitialSettingsForm(settings: AppSettings): SettingsFormValues {
  return {
    gameInstallPath: getInstallPathForGame(settings, settings.selectedGameId),
    autoBackupOnDeploy: settings.autoBackupOnDeploy,
  };
}

export function toSettingsPayload(values: SettingsFormValues, current: AppSettings): AppSettings {
  const withBackup = mergeSettings(
    {
      autoBackupOnDeploy: values.autoBackupOnDeploy,
    },
    current,
  );

  return setInstallPathForGame(
    withBackup,
    withBackup.selectedGameId,
    values.gameInstallPath.trim(),
  );
}

export function applySettingsPatch(
  values: SettingsFormValues,
  patch: Partial<SettingsFormValues>,
): SettingsFormValues {
  return {
    ...values,
    ...patch,
  };
}
