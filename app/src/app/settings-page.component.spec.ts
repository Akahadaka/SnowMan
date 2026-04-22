import { describe, expect, it } from "vitest";
import {
  applySettingsPatch,
  createInitialSettingsForm,
  toSettingsPayload,
} from "./settings-page.logic";

describe("settings page logic", () => {
  it("creates initial form values from settings", () => {
    const form = createInitialSettingsForm({
      gameInstallPath: "C:/SnowRunner",
      autoBackupOnDeploy: true,
    });

    expect(form).toEqual({
      gameInstallPath: "C:/SnowRunner",
      autoBackupOnDeploy: true,
    });
  });

  it("builds save payload with trimmed path", () => {
    const payload = toSettingsPayload({
      gameInstallPath: "  C:/SnowRunner  ",
      autoBackupOnDeploy: false,
    });

    expect(payload).toEqual({
      gameInstallPath: "C:/SnowRunner",
      autoBackupOnDeploy: false,
    });
  });

  it("applies patch over current form values", () => {
    const next = applySettingsPatch(
      {
        gameInstallPath: "D:/SnowRunner",
        autoBackupOnDeploy: true,
      },
      { autoBackupOnDeploy: false },
    );

    expect(next).toEqual({
      gameInstallPath: "D:/SnowRunner",
      autoBackupOnDeploy: false,
    });
  });
});
