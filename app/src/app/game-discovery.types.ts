export const SNOWRUNNER_GAME_ID = 'snowrunner' as const;

export type GameId = typeof SNOWRUNNER_GAME_ID;

export const STEAM_STORE_ID = 'steam' as const;
export const EPIC_STORE_ID = 'epic' as const;
export const GOG_STORE_ID = 'gog' as const;

export type StoreId = typeof STEAM_STORE_ID | typeof EPIC_STORE_ID | typeof GOG_STORE_ID;

export interface DiscoveryCandidate {
  path: string;
  storeId: StoreId;
  source: 'settings' | 'known-location';
}

export interface CandidateValidation extends DiscoveryCandidate {
  isValid: boolean;
  reason?: string;
}

export interface DiscoveryResult {
  gameId: GameId;
  status: 'found' | 'not-found';
  validCandidates: CandidateValidation[];
  candidates: CandidateValidation[];
}
