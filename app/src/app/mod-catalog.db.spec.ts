import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ApprovedModDefinition } from "./mod.types";

vi.mock("./tauri.bridge", () => ({
  tauriInvoke: vi.fn(),
}));

import { tauriInvoke } from "./tauri.bridge";
import {
  loadProfileSelections,
  saveProfileSelection,
  searchCatalog,
  syncCatalog,
} from "./mod-catalog.db";

const mockedInvoke = vi.mocked(tauriInvoke);

describe("mod catalog db bridge", () => {
  beforeEach(() => {
    mockedInvoke.mockReset();
  });

  it("syncCatalog serializes definitions and calls sync_mod_catalog", async () => {
    mockedInvoke.mockResolvedValueOnce(null);

    const mods: ApprovedModDefinition[] = [
      {
        id: "real-life-mod",
        name: "Real Life Mod",
        description: "desc",
        modIoUrl: "https://mod.io/g/snowrunner/m/real-life-mod#description",
        downloadUrl: "https://example.invalid/file.zip",
        baseInstallSteps: [
          {
            sourceRelativePath: "media",
            relativeTargetPath: "en_us/preload/paks/client/initial.pak",
            installStrategy: "archive-overlay",
          },
        ],
        options: [],
      },
    ];

    await syncCatalog(mods);

    expect(mockedInvoke).toHaveBeenCalledWith("sync_mod_catalog", {
      entries: [
        {
          id: "real-life-mod",
          name: "Real Life Mod",
          description: "desc",
          modIoUrl: "https://mod.io/g/snowrunner/m/real-life-mod#description",
          downloadUrl: "https://example.invalid/file.zip",
          baseInstallStepsJson: JSON.stringify(mods[0].baseInstallSteps),
          optionsJson: JSON.stringify(mods[0].options),
        },
      ],
    });
  });

  it("searchCatalog returns parsed rows and drops invalid rows", async () => {
    mockedInvoke.mockResolvedValueOnce([
      {
        id: "valid",
        name: "Valid",
        description: "ok",
        modIoUrl: "https://example.invalid/valid",
        downloadUrl: "https://example.invalid/valid.zip",
        baseInstallStepsJson: "[]",
        optionsJson: "[]",
      },
      {
        id: "invalid",
        name: "Invalid",
        description: "bad",
        modIoUrl: "https://example.invalid/invalid",
        downloadUrl: "https://example.invalid/invalid.zip",
        baseInstallStepsJson: "not-json",
        optionsJson: "[]",
      },
    ]);

    const result = await searchCatalog("valid", 10);

    expect(mockedInvoke).toHaveBeenCalledWith("search_mod_catalog", { query: "valid", limit: 10 });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("valid");
  });

  it("saveProfileSelection stores option map JSON", async () => {
    mockedInvoke.mockResolvedValueOnce(null);

    await saveProfileSelection("profile-1", "real-life-mod", {
      "no-recovery": true,
      "gameplay-modes": false,
    });

    expect(mockedInvoke).toHaveBeenCalledWith("upsert_profile_mod_selection", {
      profileId: "profile-1",
      modId: "real-life-mod",
      selectedOptionsJson: JSON.stringify({
        "no-recovery": true,
        "gameplay-modes": false,
      }),
    });
  });

  it("loadProfileSelections returns parsed map with safe fallback", async () => {
    mockedInvoke.mockResolvedValueOnce([
      { modId: "real-life-mod", selectedOptionsJson: '{"no-recovery":true}' },
      { modId: "broken-mod", selectedOptionsJson: "not-json" },
    ]);

    const result = await loadProfileSelections("profile-1");

    expect(mockedInvoke).toHaveBeenCalledWith("get_profile_mod_selections", {
      profileId: "profile-1",
    });
    expect(result["real-life-mod"]).toEqual({ "no-recovery": true });
    expect(result["broken-mod"]).toEqual({});
  });
});
