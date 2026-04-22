import { SNOWRUNNER_GAME_ID, type GameId } from "./game-discovery.types";
import type { GameProvider, GameRegistry } from "./game-provider";
import { snowrunnerProvider } from "./snowrunner.provider";

export function createGameRegistry(): GameRegistry {
  return {
    [SNOWRUNNER_GAME_ID]: snowrunnerProvider,
  };
}

export function getProviderForGame(gameId: GameId, registry: GameRegistry): GameProvider {
  const provider = registry[gameId];

  if (!provider) {
    throw new Error(`No provider registered for gameId: ${gameId}`);
  }

  return provider;
}
