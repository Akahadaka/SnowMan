import { getInstallPathForStore, type AppSettings } from './settings.persistence';
import {
  SNOWRUNNER_GAME_ID,
  STEAM_STORE_ID,
  EPIC_STORE_ID,
  type DiscoveryCandidate,
  type StoreId,
} from './game-discovery.types';
import type { GameProvider, PathValidationResult } from './game-provider';

const KNOWN_INSTALL_CANDIDATES: Array<{ path: string; storeId: StoreId }> = [
  {
    path: 'C:/Program Files (x86)/Steam/steamapps/common/SnowRunner',
    storeId: STEAM_STORE_ID,
  },
  {
    path: 'C:/Program Files/Epic Games/SnowRunner',
    storeId: EPIC_STORE_ID,
  },
];

export const snowrunnerProvider: GameProvider = {
  id: SNOWRUNNER_GAME_ID,

  discoverCandidates(settings: AppSettings): DiscoveryCandidate[] {
    const candidates: DiscoveryCandidate[] = [];

    // Per-store saved paths take priority
    const storeIds: StoreId[] = [STEAM_STORE_ID, EPIC_STORE_ID];
    for (const storeId of storeIds) {
      const savedPath = getInstallPathForStore(settings, storeId, SNOWRUNNER_GAME_ID);
      if (savedPath) {
        candidates.push({ path: savedPath, storeId, source: 'settings' });
      }
    }

    // Fall back to known default locations only if that store has no saved path yet
    for (const known of KNOWN_INSTALL_CANDIDATES) {
      const alreadyFromSettings = candidates.some(
        (c) => c.storeId === known.storeId && c.source === 'settings',
      );
      if (!alreadyFromSettings) {
        candidates.push({ ...known, source: 'known-location' });
      }
    }

    return candidates;
  },

  validateInstallPath(path: string): PathValidationResult {
    if (!path.trim()) {
      return { isValid: false, reason: 'Path is empty.' };
    }

    if (!path.toLowerCase().includes('snowrunner')) {
      return {
        isValid: false,
        reason: 'Install path does not look like a SnowRunner directory.',
      };
    }

    return { isValid: true };
  },

  getDefaultProfileRoot(installPath: string): string {
    const normalized = installPath.replace(/\\/g, '/').replace(/\/$/, '');
    return `${normalized}/SnowManProfiles`;
  },
};
