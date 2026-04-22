export const SNOWRUNNER_GAME_ID = "snowrunner" as const;

export type GameId = typeof SNOWRUNNER_GAME_ID;

export interface DiscoveryCandidate {
  path: string;
  source: "settings" | "known-location";
}

export interface CandidateValidation extends DiscoveryCandidate {
  isValid: boolean;
  reason?: string;
}

export interface DiscoveryResult {
  gameId: GameId;
  status: "found" | "not-found";
  discoveredPath: string | null;
  candidates: CandidateValidation[];
}
