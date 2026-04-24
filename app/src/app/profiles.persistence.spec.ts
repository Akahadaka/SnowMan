import { describe, expect, it } from 'vitest';
import {
  createProfile,
  deleteProfile,
  getProfiles,
  setActiveProfile,
  updateProfile,
} from './profiles.persistence';
import { SNOWRUNNER_GAME_ID, STEAM_STORE_ID, EPIC_STORE_ID } from './game-discovery.types';
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from './settings.persistence';

describe('profiles persistence', () => {
  // AC-01
  it('creates a profile under the correct store/game node', () => {
    const updated = createProfile(DEFAULT_SETTINGS, STEAM_STORE_ID, SNOWRUNNER_GAME_ID, 'Vanilla');

    const profiles = getProfiles(updated, STEAM_STORE_ID, SNOWRUNNER_GAME_ID);

    expect(profiles).toHaveLength(1);
    expect(profiles[0].name).toBe('Vanilla');
    expect(profiles[0].id).toBeTruthy();
    expect(profiles[0].createdAt).toBeTruthy();
    expect(profiles[0].updatedAt).toBe(profiles[0].createdAt);
  });

  it('creating a profile does not affect other store/game nodes', () => {
    const updated = createProfile(DEFAULT_SETTINGS, STEAM_STORE_ID, SNOWRUNNER_GAME_ID, 'Vanilla');

    const epicProfiles = getProfiles(updated, EPIC_STORE_ID, SNOWRUNNER_GAME_ID);

    expect(epicProfiles).toHaveLength(0);
  });

  // AC-02
  it('returns empty array when no profiles exist', () => {
    const profiles = getProfiles(DEFAULT_SETTINGS, STEAM_STORE_ID, SNOWRUNNER_GAME_ID);

    expect(profiles).toEqual([]);
  });

  it('returns profiles sorted by createdAt ascending', () => {
    let settings = createProfile(DEFAULT_SETTINGS, STEAM_STORE_ID, SNOWRUNNER_GAME_ID, 'Alpha');
    settings = createProfile(settings, STEAM_STORE_ID, SNOWRUNNER_GAME_ID, 'Beta');

    const profiles = getProfiles(settings, STEAM_STORE_ID, SNOWRUNNER_GAME_ID);

    expect(profiles[0].name).toBe('Alpha');
    expect(profiles[1].name).toBe('Beta');
  });

  // AC-03
  it('updates name and description while keeping id and createdAt immutable', () => {
    let settings = createProfile(DEFAULT_SETTINGS, STEAM_STORE_ID, SNOWRUNNER_GAME_ID, 'Original');
    const original = getProfiles(settings, STEAM_STORE_ID, SNOWRUNNER_GAME_ID)[0];

    settings = updateProfile(settings, STEAM_STORE_ID, SNOWRUNNER_GAME_ID, original.id, {
      name: 'Renamed',
      description: 'Added description',
    });

    const updated = getProfiles(settings, STEAM_STORE_ID, SNOWRUNNER_GAME_ID)[0];

    expect(updated.id).toBe(original.id);
    expect(updated.createdAt).toBe(original.createdAt);
    expect(updated.name).toBe('Renamed');
    expect(updated.description).toBe('Added description');
    expect(updated.updatedAt >= original.updatedAt).toBe(true);
  });

  it('returns settings unchanged when updating a non-existent profile id', () => {
    const result = updateProfile(
      DEFAULT_SETTINGS,
      STEAM_STORE_ID,
      SNOWRUNNER_GAME_ID,
      'does-not-exist',
      { name: 'Ghost' },
    );

    expect(result).toEqual(DEFAULT_SETTINGS);
  });

  // AC-04
  it('deletes a profile by id', () => {
    let settings = createProfile(DEFAULT_SETTINGS, STEAM_STORE_ID, SNOWRUNNER_GAME_ID, 'ToDelete');
    const profile = getProfiles(settings, STEAM_STORE_ID, SNOWRUNNER_GAME_ID)[0];

    settings = deleteProfile(settings, STEAM_STORE_ID, SNOWRUNNER_GAME_ID, profile.id);

    expect(getProfiles(settings, STEAM_STORE_ID, SNOWRUNNER_GAME_ID)).toHaveLength(0);
  });

  it('clears activeProfileId when the active profile is deleted', () => {
    let settings = createProfile(DEFAULT_SETTINGS, STEAM_STORE_ID, SNOWRUNNER_GAME_ID, 'Active');
    const profile = getProfiles(settings, STEAM_STORE_ID, SNOWRUNNER_GAME_ID)[0];

    settings = setActiveProfile(settings, STEAM_STORE_ID, SNOWRUNNER_GAME_ID, profile.id);
    settings = deleteProfile(settings, STEAM_STORE_ID, SNOWRUNNER_GAME_ID, profile.id);

    const activeId =
      settings.stores[STEAM_STORE_ID]?.games[SNOWRUNNER_GAME_ID]?.activeProfileId ?? null;
    expect(activeId).toBeNull();
  });

  it('silently no-ops when deleting a non-existent profile', () => {
    const result = deleteProfile(
      DEFAULT_SETTINGS,
      STEAM_STORE_ID,
      SNOWRUNNER_GAME_ID,
      'does-not-exist',
    );

    expect(result).toEqual(DEFAULT_SETTINGS);
  });

  // AC-05
  it('sets the active profile id', () => {
    let settings = createProfile(DEFAULT_SETTINGS, STEAM_STORE_ID, SNOWRUNNER_GAME_ID, 'My Pack');
    const profile = getProfiles(settings, STEAM_STORE_ID, SNOWRUNNER_GAME_ID)[0];

    settings = setActiveProfile(settings, STEAM_STORE_ID, SNOWRUNNER_GAME_ID, profile.id);

    const activeId = settings.stores[STEAM_STORE_ID]?.games[SNOWRUNNER_GAME_ID]?.activeProfileId;
    expect(activeId).toBe(profile.id);
  });

  it('is a no-op when setting a non-existent profile as active', () => {
    let settings = createProfile(DEFAULT_SETTINGS, STEAM_STORE_ID, SNOWRUNNER_GAME_ID, 'Keep');
    const profile = getProfiles(settings, STEAM_STORE_ID, SNOWRUNNER_GAME_ID)[0];
    settings = setActiveProfile(settings, STEAM_STORE_ID, SNOWRUNNER_GAME_ID, profile.id);

    const result = setActiveProfile(settings, STEAM_STORE_ID, SNOWRUNNER_GAME_ID, 'does-not-exist');

    const activeId = result.stores[STEAM_STORE_ID]?.games[SNOWRUNNER_GAME_ID]?.activeProfileId;
    expect(activeId).toBe(profile.id);
  });

  // AC-06
  it('profiles survive a save/load round-trip', () => {
    let settings = createProfile(DEFAULT_SETTINGS, STEAM_STORE_ID, SNOWRUNNER_GAME_ID, 'Saved');
    const profile = getProfiles(settings, STEAM_STORE_ID, SNOWRUNNER_GAME_ID)[0];
    settings = setActiveProfile(settings, STEAM_STORE_ID, SNOWRUNNER_GAME_ID, profile.id);

    let stored: string | null = null;
    const storage = {
      getItem: () => stored,
      setItem: (_: string, v: string) => {
        stored = v;
      },
    };

    saveSettings(storage, settings);
    const loaded = loadSettings(storage);

    expect(getProfiles(loaded, STEAM_STORE_ID, SNOWRUNNER_GAME_ID)).toEqual(
      getProfiles(settings, STEAM_STORE_ID, SNOWRUNNER_GAME_ID),
    );
    expect(loaded.stores[STEAM_STORE_ID]?.games[SNOWRUNNER_GAME_ID]?.activeProfileId).toBe(
      profile.id,
    );
  });
});
