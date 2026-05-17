import type { AppSettings } from './settings.persistence';
import type { DiscoveryCandidate, GameId } from './game-discovery.types';

export interface PathValidationResult {
  isValid: boolean;
  reason?: string;
}

export interface GameProvider {
  id: GameId;
  discoverCandidates(settings: AppSettings): DiscoveryCandidate[];
  validateInstallPath(path: string): PathValidationResult;
  getDefaultProfileRoot(installPath: string): string;
}

export type GameRegistry = Record<GameId, GameProvider>;
