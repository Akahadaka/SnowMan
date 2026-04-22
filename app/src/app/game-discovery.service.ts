import type { DiscoveryResult, GameId } from "./game-discovery.types";
import { createGameRegistry, getProviderForGame } from "./game-registry";
import type { GameRegistry } from "./game-provider";
import type { AppSettings } from "./settings.persistence";

export function discoverGameInstallPath(
  gameId: GameId,
  settings: AppSettings,
  registry: GameRegistry = createGameRegistry(),
): DiscoveryResult {
  const provider = getProviderForGame(gameId, registry);
  const candidates = provider.discoverCandidates(settings);

  const validatedCandidates = candidates.map((candidate) => {
    const validation = provider.validateInstallPath(candidate.path);

    return {
      ...candidate,
      ...validation,
    };
  });

  const found = validatedCandidates.find((candidate) => candidate.isValid);

  return {
    gameId,
    status: found ? "found" : "not-found",
    discoveredPath: found?.path ?? null,
    candidates: validatedCandidates,
  };
}
