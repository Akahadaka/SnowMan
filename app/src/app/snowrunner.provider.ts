import { getInstallPathForGame, type AppSettings } from "./settings.persistence";
import { SNOWRUNNER_GAME_ID, type DiscoveryCandidate } from "./game-discovery.types";
import type { GameProvider, PathValidationResult } from "./game-provider";

const KNOWN_INSTALL_CANDIDATES = [
  "C:/Program Files (x86)/Steam/steamapps/common/SnowRunner",
  "C:/Program Files/Epic Games/SnowRunner",
];

export const snowrunnerProvider: GameProvider = {
  id: SNOWRUNNER_GAME_ID,

  discoverCandidates(settings: AppSettings): DiscoveryCandidate[] {
    const fromSettings = getInstallPathForGame(settings, SNOWRUNNER_GAME_ID);
    const paths = [fromSettings, ...KNOWN_INSTALL_CANDIDATES].filter((path) => path.length > 0);
    const uniquePaths = [...new Set(paths)];

    return uniquePaths.map((path, index) => ({
      path,
      source: index === 0 && fromSettings ? "settings" : "known-location",
    }));
  },

  validateInstallPath(path: string): PathValidationResult {
    if (!path.trim()) {
      return { isValid: false, reason: "Path is empty." };
    }

    if (!path.toLowerCase().includes("snowrunner")) {
      return {
        isValid: false,
        reason: "Install path does not look like a SnowRunner directory.",
      };
    }

    return { isValid: true };
  },

  getDefaultProfileRoot(installPath: string): string {
    const normalized = installPath.replace(/\\/g, "/").replace(/\/$/, "");
    return `${normalized}/SnowManProfiles`;
  },
};
