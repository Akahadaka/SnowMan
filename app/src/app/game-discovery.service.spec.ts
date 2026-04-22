import { describe, expect, it } from "vitest";
import { discoverGameInstallPath } from "./game-discovery.service";
import { SNOWRUNNER_GAME_ID, STEAM_STORE_ID } from "./game-discovery.types";
import { DEFAULT_SETTINGS, mergeSettings } from "./settings.persistence";

describe("game discovery orchestration", () => {
  it("dispatches by game id and returns all valid candidates", () => {
    const settings = mergeSettings(
      {
        stores: {
          steam: {
            games: {
              snowrunner: {
                installPath: "D:/SteamLibrary/steamapps/common/SnowRunner",
                profileRootPath: "",
              },
            },
          },
        },
      },
      DEFAULT_SETTINGS,
    );

    const result = discoverGameInstallPath(SNOWRUNNER_GAME_ID, settings);

    expect(result.status).toBe("found");
    expect(result.validCandidates.length).toBeGreaterThan(0);
    expect(result.validCandidates[0].path).toBe("D:/SteamLibrary/steamapps/common/SnowRunner");
    expect(result.validCandidates[0].storeId).toBe(STEAM_STORE_ID);
  });
});
