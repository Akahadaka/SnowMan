import { describe, expect, it } from 'vitest';
import {
  applySettingsPatch,
  createInitialSettingsForm,
  toSettingsPayload,
} from './settings-page.logic';
import { SNOWRUNNER_GAME_ID, STEAM_STORE_ID } from './game-discovery.types';
import { DEFAULT_SETTINGS } from './settings.persistence';

describe('settings page logic', () => {
  it('creates initial form values from settings', () => {
    const form = createInitialSettingsForm({
      ...DEFAULT_SETTINGS,
      selectedGameId: SNOWRUNNER_GAME_ID,
      selectedStoreId: STEAM_STORE_ID,
      autoBackupOnDeploy: true,
      stores: {
        steam: {
          games: {
            snowrunner: {
              installPath: 'C:/SnowRunner',
              profileRootPath: '',
            },
          },
        },
      },
    });

    expect(form).toEqual({
      gameInstallPath: 'C:/SnowRunner',
      autoBackupOnDeploy: true,
    });
  });

  it('builds save payload with trimmed path', () => {
    const payload = toSettingsPayload(
      {
        gameInstallPath: '  C:/SnowRunner  ',
        autoBackupOnDeploy: false,
      },
      DEFAULT_SETTINGS,
    );

    expect(payload).toEqual({
      selectedGameId: SNOWRUNNER_GAME_ID,
      selectedStoreId: STEAM_STORE_ID,
      autoBackupOnDeploy: false,
      onboardingComplete: false,
      stores: {
        steam: {
          games: {
            snowrunner: {
              installPath: 'C:/SnowRunner',
              profileRootPath: '',
            },
          },
        },
      },
    });
  });

  it('applies patch over current form values', () => {
    const next = applySettingsPatch(
      {
        gameInstallPath: 'D:/SnowRunner',
        autoBackupOnDeploy: true,
      },
      { autoBackupOnDeploy: false },
    );

    expect(next).toEqual({
      gameInstallPath: 'D:/SnowRunner',
      autoBackupOnDeploy: false,
    });
  });
});
