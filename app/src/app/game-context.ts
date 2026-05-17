import {
  EPIC_STORE_ID,
  SNOWRUNNER_GAME_ID,
  STEAM_STORE_ID,
  type GameId,
  type StoreId,
} from './game-discovery.types';

export interface StoreOption {
  id: StoreId;
  label: string;
}

export interface GameOption {
  id: GameId;
  label: string;
}

export const ACTIVE_STORE_ID: StoreId = STEAM_STORE_ID;
export const ACTIVE_GAME_ID: GameId = SNOWRUNNER_GAME_ID;

export const STORE_OPTIONS: ReadonlyArray<StoreOption> = [
  { id: STEAM_STORE_ID, label: 'Steam' },
  { id: EPIC_STORE_ID, label: 'Epic Games Store' },
];

export const GAME_OPTIONS: ReadonlyArray<GameOption> = [
  { id: SNOWRUNNER_GAME_ID, label: 'SnowRunner' },
];
