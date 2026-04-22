import { describe, expect, it } from "vitest";
import {
  createNamedProfile,
  deriveLaunchContext,
  selectActiveProfile,
} from "./profiles-page.logic";
import { SNOWRUNNER_GAME_ID, STEAM_STORE_ID } from "./game-discovery.types";
import { DEFAULT_SETTINGS, mergeSettings } from "./settings.persistence";

describe("profiles page logic", () => {
  it("creates a trimmed profile name", () => {
    const result = createNamedProfile(
      DEFAULT_SETTINGS,
      STEAM_STORE_ID,
      SNOWRUNNER_GAME_ID,
      "  Rally Setup  ",
    );

    expect(result.created).toBe(true);
    expect(result.profile?.name).toBe("Rally Setup");
  });

  it("rejects empty profile names", () => {
    const result = createNamedProfile(DEFAULT_SETTINGS, STEAM_STORE_ID, SNOWRUNNER_GAME_ID, "   ");

    expect(result.created).toBe(false);
    expect(result.settings).toEqual(DEFAULT_SETTINGS);
  });

  it("sets active profile id", () => {
    const created = createNamedProfile(
      DEFAULT_SETTINGS,
      STEAM_STORE_ID,
      SNOWRUNNER_GAME_ID,
      "Primary",
    );

    const profileId = created.profile?.id ?? "";
    const updated = selectActiveProfile(
      created.settings,
      STEAM_STORE_ID,
      SNOWRUNNER_GAME_ID,
      profileId,
    );

    const active = updated.stores[STEAM_STORE_ID]?.games[SNOWRUNNER_GAME_ID]?.activeProfileId;
    expect(active).toBe(profileId);
  });

  it("blocks launch when no active profile exists", () => {
    const context = deriveLaunchContext(DEFAULT_SETTINGS, STEAM_STORE_ID, SNOWRUNNER_GAME_ID);

    expect(context.canLaunch).toBe(false);
    expect(context.reason).toContain("active profile");
  });

  it("blocks launch when install path is missing", () => {
    const created = createNamedProfile(
      DEFAULT_SETTINGS,
      STEAM_STORE_ID,
      SNOWRUNNER_GAME_ID,
      "Primary",
    );
    const withActive = selectActiveProfile(
      created.settings,
      STEAM_STORE_ID,
      SNOWRUNNER_GAME_ID,
      created.profile?.id ?? "",
    );

    const context = deriveLaunchContext(withActive, STEAM_STORE_ID, SNOWRUNNER_GAME_ID);

    expect(context.canLaunch).toBe(false);
    expect(context.reason).toContain("install path");
  });

  it("derives SnowRunner executable path under Sources/Bin when launch is ready", () => {
    const created = createNamedProfile(
      DEFAULT_SETTINGS,
      STEAM_STORE_ID,
      SNOWRUNNER_GAME_ID,
      "Primary",
    );
    const withActive = selectActiveProfile(
      created.settings,
      STEAM_STORE_ID,
      SNOWRUNNER_GAME_ID,
      created.profile?.id ?? "",
    );

    const withInstallPath = mergeSettings(
      {
        stores: {
          steam: {
            games: {
              snowrunner: {
                installPath: "D:/SteamLibrary/steamapps/common/SnowRunner/",
              },
            },
          },
        },
      },
      withActive,
    );

    const context = deriveLaunchContext(withInstallPath, STEAM_STORE_ID, SNOWRUNNER_GAME_ID);

    expect(context.canLaunch).toBe(true);
    expect(context.executablePath).toBe(
      "D:/SteamLibrary/steamapps/common/SnowRunner/Sources/Bin/SnowRunner.exe",
    );
  });
});
