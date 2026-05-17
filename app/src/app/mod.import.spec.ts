import { describe, expect, it } from 'vitest';
import {
  addModToProfile,
  buildDeployCandidates,
  getModsForProfile,
  importModFromFolder,
} from './mod.import';
import { SNOWRUNNER_GAME_ID, STEAM_STORE_ID } from './game-discovery.types';
import { DEFAULT_SETTINGS } from './settings.persistence';
import type { ModEntry } from './mod.types';

describe('importModFromFolder', () => {
  it('derives id and name from folder name when no manifest provided', () => {
    const result = importModFromFolder('D:/mods/muddy-wheels');

    expect(result.id).toBe('muddy-wheels');
    expect(result.name).toBe('muddy-wheels');
    expect(result.sourceFolderPath).toBe('D:/mods/muddy-wheels');
    expect(result.importedAt).toBeTruthy();
  });

  it('throws a typed error when folder path is empty', () => {
    expect(() => importModFromFolder('')).toThrow();
    expect(() => importModFromFolder('   ')).toThrow();
  });

  it('uses manifest values when an explicit manifest is provided', () => {
    const manifest = { id: 'better-trucks', name: 'Better Trucks', description: 'Improves trucks' };
    const result = importModFromFolder('D:/mods/better-trucks', manifest);

    expect(result.id).toBe('better-trucks');
    expect(result.name).toBe('Better Trucks');
    expect(result.description).toBe('Improves trucks');
  });
});

describe('buildDeployCandidates', () => {
  const modEntry: ModEntry = {
    id: 'muddy-wheels',
    name: 'muddy-wheels',
    sourceFolderPath: 'D:/mods/muddy-wheels',
    importedAt: '2026-01-01T00:00:00.000Z',
  };

  it('returns one candidate per file in the file list', () => {
    const files = ['textures/wheel.pak', 'textures/mud.pak'];
    const candidates = buildDeployCandidates(modEntry, 'D:/game', files);

    expect(candidates).toHaveLength(2);
    expect(candidates[0].modId).toBe('muddy-wheels');
    expect(candidates[0].relativeTargetPath).toBe('textures/wheel.pak');
    expect(candidates[1].relativeTargetPath).toBe('textures/mud.pak');
  });

  it('sets targetExists using an injected existence checker', () => {
    const files = ['textures/wheel.pak'];
    const existsChecker = (path: string) => path.includes('wheel');
    const candidates = buildDeployCandidates(modEntry, 'D:/game', files, existsChecker);

    expect(candidates[0].targetExists).toBe(true);
  });

  it('defaults targetExists to false without an existence checker', () => {
    const files = ['textures/wheel.pak'];
    const candidates = buildDeployCandidates(modEntry, 'D:/game', files);

    expect(candidates[0].targetExists).toBe(false);
  });

  it('throws a typed error when sourceFolderPath is empty', () => {
    const badEntry: ModEntry = { ...modEntry, sourceFolderPath: '' };
    expect(() => buildDeployCandidates(badEntry, 'D:/game', [])).toThrow();
  });
});

describe('addModToProfile and getModsForProfile', () => {
  const modEntry: ModEntry = {
    id: 'muddy-wheels',
    name: 'muddy-wheels',
    sourceFolderPath: 'D:/mods/muddy-wheels',
    importedAt: '2026-01-01T00:00:00.000Z',
  };

  it('stores a mod entry under the correct profile', () => {
    const profileId = 'profile-1';
    const updated = addModToProfile(
      DEFAULT_SETTINGS,
      STEAM_STORE_ID,
      SNOWRUNNER_GAME_ID,
      profileId,
      modEntry,
    );

    const mods = getModsForProfile(updated, STEAM_STORE_ID, SNOWRUNNER_GAME_ID, profileId);
    expect(mods['muddy-wheels']).toEqual(modEntry);
  });

  it('replaces an existing mod entry with the same id', () => {
    const profileId = 'profile-1';
    const first = addModToProfile(
      DEFAULT_SETTINGS,
      STEAM_STORE_ID,
      SNOWRUNNER_GAME_ID,
      profileId,
      modEntry,
    );
    const updated: ModEntry = { ...modEntry, name: 'Muddy Wheels v2' };
    const second = addModToProfile(first, STEAM_STORE_ID, SNOWRUNNER_GAME_ID, profileId, updated);

    const mods = getModsForProfile(second, STEAM_STORE_ID, SNOWRUNNER_GAME_ID, profileId);
    expect(Object.keys(mods)).toHaveLength(1);
    expect(mods['muddy-wheels'].name).toBe('Muddy Wheels v2');
  });

  it('returns an empty object for an unknown profile', () => {
    const mods = getModsForProfile(
      DEFAULT_SETTINGS,
      STEAM_STORE_ID,
      SNOWRUNNER_GAME_ID,
      'nonexistent',
    );
    expect(mods).toEqual({});
  });
});
