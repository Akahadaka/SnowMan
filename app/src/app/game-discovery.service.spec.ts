import { describe, expect, it } from "vitest";
import { discoverGameInstallPath } from "./game-discovery.service";
import { SNOWRUNNER_GAME_ID } from "./game-discovery.types";
import { DEFAULT_SETTINGS, mergeSettings } from "./settings.persistence";

describe("game discovery orchestration", () => {
  it("dispatches by game id and returns discovered path when a candidate validates", () => {
    const settings = mergeSettings(
      {
        games: {
          snowrunner: {
            installPath: "D:/SteamLibrary/steamapps/common/SnowRunner",
            profileRootPath: "",
          },
        },
      },
      DEFAULT_SETTINGS,
    );

    const result = discoverGameInstallPath(SNOWRUNNER_GAME_ID, settings);

    expect(result.status).toBe("found");
    expect(result.discoveredPath).toBe("D:/SteamLibrary/steamapps/common/SnowRunner");
  });
});
