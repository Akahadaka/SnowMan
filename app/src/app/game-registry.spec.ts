import { describe, expect, it } from 'vitest';
import { createGameRegistry, getProviderForGame } from './game-registry';
import { SNOWRUNNER_GAME_ID } from './game-discovery.types';

describe('game registry', () => {
  it('registers the snowrunner provider under its game id', () => {
    const registry = createGameRegistry();

    const provider = getProviderForGame(SNOWRUNNER_GAME_ID, registry);

    expect(provider.id).toBe(SNOWRUNNER_GAME_ID);
  });
});
