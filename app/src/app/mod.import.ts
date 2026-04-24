import type { GameId, StoreId } from './game-discovery.types';
import type { ModEntry, ModManifest, ModsMap } from './mod.types';
import type { DeployCandidate } from './safety-dry-run.types';
import { mergeSettings, type AppSettings } from './settings.persistence';

function getFolderName(folderPath: string): string {
  return folderPath.replace(/\\/g, '/').replace(/\/$/, '').split('/').pop() ?? folderPath;
}

export function importModFromFolder(folderPath: string, manifest?: ModManifest): ModEntry {
  if (!folderPath.trim()) {
    const error: { code: string; message: string } = {
      code: 'empty-path',
      message: 'Mod folder path must not be empty.',
    };
    throw error;
  }

  const folderName = getFolderName(folderPath);

  return {
    id: manifest?.id ?? folderName,
    name: manifest?.name ?? folderName,
    sourceFolderPath: folderPath,
    importedAt: new Date().toISOString(),
    ...(manifest?.description !== undefined ? { description: manifest.description } : {}),
  };
}

export function buildDeployCandidates(
  modEntry: ModEntry,
  gameInstallPath: string,
  files: string[],
  existsChecker?: (path: string) => boolean,
): DeployCandidate[] {
  if (!modEntry.sourceFolderPath.trim()) {
    const error: { code: string; message: string } = {
      code: 'empty-path',
      message: 'Mod sourceFolderPath must not be empty.',
    };
    throw error;
  }

  return files.map((relPath) => {
    const normalizedInstall = gameInstallPath.replace(/\\/g, '/').replace(/\/$/, '');
    const sourcePath = `${modEntry.sourceFolderPath.replace(/\\/g, '/').replace(/\/$/, '')}/${relPath}`;
    const targetPath = `${normalizedInstall}/${relPath}`;
    const targetExists = existsChecker ? existsChecker(targetPath) : false;

    return {
      modId: modEntry.id,
      sourcePath,
      relativeTargetPath: relPath,
      targetExists,
    };
  });
}

export function addModToProfile(
  settings: AppSettings,
  storeId: StoreId,
  gameId: GameId,
  profileId: string,
  modEntry: ModEntry,
): AppSettings {
  const profiles = settings.stores[storeId]?.games[gameId]?.profiles ?? {};
  const existingProfile = profiles[profileId] ?? {
    id: profileId,
    name: profileId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const existingMods: ModsMap = (existingProfile as { mods?: ModsMap }).mods ?? {};
  const updatedMods: ModsMap = { ...existingMods, [modEntry.id]: modEntry };
  const updatedProfile = { ...existingProfile, mods: updatedMods };
  const updatedProfiles = { ...profiles, [profileId]: updatedProfile };

  return mergeSettings(
    {
      stores: {
        [storeId]: {
          games: {
            [gameId]: { profiles: updatedProfiles },
          },
        },
      },
    },
    settings,
  );
}

export function getModsForProfile(
  settings: AppSettings,
  storeId: StoreId,
  gameId: GameId,
  profileId: string,
): ModsMap {
  const profile = settings.stores[storeId]?.games[gameId]?.profiles?.[profileId];
  return (profile as { mods?: ModsMap } | undefined)?.mods ?? {};
}
