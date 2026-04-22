import type { GameId, StoreId } from "./game-discovery.types";
import type { Profile } from "./profile.types";
import { createProfile, getProfiles, setActiveProfile } from "./profiles.persistence";
import { getInstallPathForStore, type AppSettings } from "./settings.persistence";

export interface CreateNamedProfileResult {
  settings: AppSettings;
  created: boolean;
  profile?: Profile;
}

export interface LaunchContext {
  canLaunch: boolean;
  reason?: string;
  executablePath?: string;
  activeProfileId?: string;
}

function normalizeInstallPath(path: string): string {
  return path.replace(/\\/g, "/").replace(/\/$/, "");
}

function deriveSnowRunnerExecutablePath(installPath: string): string {
  const normalized = normalizeInstallPath(installPath);
  return `${normalized}/Sources/Bin/SnowRunner.exe`;
}

export function createNamedProfile(
  settings: AppSettings,
  storeId: StoreId,
  gameId: GameId,
  rawName: string,
): CreateNamedProfileResult {
  const trimmed = rawName.trim();

  if (!trimmed) {
    return {
      settings,
      created: false,
    };
  }

  const next = createProfile(settings, storeId, gameId, trimmed);
  const created = getProfiles(next, storeId, gameId).find((profile) => profile.name === trimmed);

  return {
    settings: next,
    created: true,
    profile: created,
  };
}

export function selectActiveProfile(
  settings: AppSettings,
  storeId: StoreId,
  gameId: GameId,
  profileId: string,
): AppSettings {
  return setActiveProfile(settings, storeId, gameId, profileId);
}

export function deriveLaunchContext(
  settings: AppSettings,
  storeId: StoreId,
  gameId: GameId,
): LaunchContext {
  const activeProfileId = settings.stores[storeId]?.games[gameId]?.activeProfileId ?? null;

  if (!activeProfileId) {
    return {
      canLaunch: false,
      reason: "Select an active profile before launching.",
    };
  }

  const installPath = getInstallPathForStore(settings, storeId, gameId).trim();
  if (!installPath) {
    return {
      canLaunch: false,
      reason: "Set the game install path in Settings before launching.",
      activeProfileId,
    };
  }

  return {
    canLaunch: true,
    activeProfileId,
    executablePath: deriveSnowRunnerExecutablePath(installPath),
  };
}
