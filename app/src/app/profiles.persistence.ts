import type { GameId, StoreId } from "./game-discovery.types";
import type { Profile, ProfilesMap } from "./profile.types";
import { mergeSettings, type AppSettings } from "./settings.persistence";

function now(): string {
  return new Date().toISOString();
}

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function getProfilesMap(settings: AppSettings, storeId: StoreId, gameId: GameId): ProfilesMap {
  return settings.stores[storeId]?.games[gameId]?.profiles ?? {};
}

function patchGame(
  settings: AppSettings,
  storeId: StoreId,
  gameId: GameId,
  patch: Partial<{ profiles: ProfilesMap; activeProfileId: string | null }>,
): AppSettings {
  return mergeSettings(
    {
      stores: {
        [storeId]: {
          games: {
            [gameId]: patch,
          },
        },
      },
    },
    settings,
  );
}

export function getProfiles(settings: AppSettings, storeId: StoreId, gameId: GameId): Profile[] {
  const map = getProfilesMap(settings, storeId, gameId);
  return Object.values(map).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function createProfile(
  settings: AppSettings,
  storeId: StoreId,
  gameId: GameId,
  name: string,
): AppSettings {
  const timestamp = now();
  const id = generateId();
  const newProfile: Profile = { id, name, createdAt: timestamp, updatedAt: timestamp };

  const existing = getProfilesMap(settings, storeId, gameId);
  const profiles: ProfilesMap = { ...existing, [id]: newProfile };

  return patchGame(settings, storeId, gameId, { profiles });
}

export function updateProfile(
  settings: AppSettings,
  storeId: StoreId,
  gameId: GameId,
  profileId: string,
  patch: Partial<Pick<Profile, "name" | "description">>,
): AppSettings {
  const existing = getProfilesMap(settings, storeId, gameId);
  const profile = existing[profileId];

  if (!profile) {
    return settings;
  }

  const updated: Profile = { ...profile, ...patch, updatedAt: now() };
  const profiles: ProfilesMap = { ...existing, [profileId]: updated };

  return patchGame(settings, storeId, gameId, { profiles });
}

export function deleteProfile(
  settings: AppSettings,
  storeId: StoreId,
  gameId: GameId,
  profileId: string,
): AppSettings {
  const existing = getProfilesMap(settings, storeId, gameId);

  if (!existing[profileId]) {
    return settings;
  }

  const profiles: ProfilesMap = { ...existing };
  delete profiles[profileId];

  const currentActiveId = settings.stores[storeId]?.games[gameId]?.activeProfileId ?? null;
  const activeProfileId = currentActiveId === profileId ? null : currentActiveId;

  return patchGame(settings, storeId, gameId, { profiles, activeProfileId });
}

export function setActiveProfile(
  settings: AppSettings,
  storeId: StoreId,
  gameId: GameId,
  profileId: string,
): AppSettings {
  const existing = getProfilesMap(settings, storeId, gameId);

  if (!existing[profileId]) {
    return settings;
  }

  return patchGame(settings, storeId, gameId, { activeProfileId: profileId });
}
