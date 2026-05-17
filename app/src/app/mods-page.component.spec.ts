import { describe, expect, it } from 'vitest';
import { addModToProfile } from './mod.import';
import { ModsPageComponent } from './mods-page.component';
import { DEFAULT_SETTINGS, type AppSettings } from './settings.persistence';

describe('ModsPageComponent', () => {
  it('renders without errors', () => {
    const component = new ModsPageComponent();
    expect(component).toBeTruthy();
  });

  it('exposes at least one approved mod', () => {
    const component = new ModsPageComponent();
    expect(component.approvedMods.length).toBeGreaterThan(0);
    expect(component.approvedMods[0].id).toBe('real-life-mod');
  });

  it('merges mod.io and curated duplicates into one online item', () => {
    const component = new ModsPageComponent();
    component.modioMods = [
      {
        id: 182067,
        name: 'Real Life Mod Official',
        summary: 'Official mod.io summary',
        profileUrl: 'https://mod.io/g/snowrunner/m/real-life-mod',
        thumbnailUrl: 'https://cdn.example/thumb.jpg',
        downloadUrl: 'https://cdn.example/mod.zip',
        tags: ['Gameplay'],
        dateUpdated: 1700000000,
        downloadsTotal: 10,
        subscribersTotal: 5,
      },
    ];

    const items = component.onlineCatalogItems;
    expect(items).toHaveLength(1);
    expect(items[0].name).toBe('Real Life Mod Official');
    expect(items[0].summary).toBe('Official mod.io summary');
    expect(items[0].approved?.id).toBe('real-life-mod');
  });

  it('keeps curated-only entries in the online list when no mod.io match exists', () => {
    const component = new ModsPageComponent();
    component.modioMods = [];

    const items = component.onlineCatalogItems;
    expect(items.length).toBeGreaterThan(0);
    expect(items[0].approved?.id).toBe('real-life-mod');
  });

  it("defaults activeTab to 'installed'", () => {
    const component = new ModsPageComponent();
    expect(component.activeTab).toBe('installed');
  });

  it('installedMods returns empty array when no active profile', () => {
    const component = new ModsPageComponent();
    expect(component.installedMods).toEqual([]);
  });

  it('toggleOnlineExpand sets expandedOnlineKey', () => {
    const component = new ModsPageComponent();
    component.toggleOnlineExpand('some-mod');
    expect(component.expandedOnlineKey).toBe('some-mod');
  });

  it('toggleOnlineExpand collapses when same key clicked twice', () => {
    const component = new ModsPageComponent();
    component.toggleOnlineExpand('some-mod');
    component.toggleOnlineExpand('some-mod');
    expect(component.expandedOnlineKey).toBeNull();
  });

  it('updateAll resolves without error when no mods installed', async () => {
    const component = new ModsPageComponent();
    await expect(component.updateAll()).resolves.toBeUndefined();
  });

  it('removeInstalledMod removes a mod from the active profile', () => {
    const component = new ModsPageComponent();
    const settingsWithProfile = {
      ...DEFAULT_SETTINGS,
      stores: {
        steam: {
          games: {
            snowrunner: {
              installPath: 'D:/SnowRunner',
              profileRootPath: 'D:/SnowRunner/profiles',
              activeProfileId: 'profile-1',
              profiles: {
                'profile-1': {
                  id: 'profile-1',
                  name: 'Profile 1',
                  createdAt: '2026-01-01T00:00:00.000Z',
                  updatedAt: '2026-01-01T00:00:00.000Z',
                },
              },
            },
          },
        },
      },
    };

    (component as unknown as { settings: AppSettings }).settings = addModToProfile(
      settingsWithProfile,
      'steam',
      'snowrunner',
      'profile-1',
      {
        id: 'modio-182067',
        name: 'Real Life Mod',
        sourceFolderPath: 'D:/SnowRunner/downloaded/modio-182067',
        importedAt: '2026-01-01T00:00:00.000Z',
        modioModId: 182067,
      },
    );
    component.profiles = [
      {
        id: 'profile-1',
        name: 'Profile 1',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ];

    expect(component.installedMods).toHaveLength(1);
    component.removeInstalledMod(component.installedMods[0]);

    expect(component.installedMods).toEqual([]);
    expect(component.statusMessage).toMatch(/unsubscribed/i);
  });

  it('keeps only subscription-tracked mods in the subscribed list', () => {
    const component = new ModsPageComponent();
    const settingsWithProfile = {
      ...DEFAULT_SETTINGS,
      stores: {
        steam: {
          games: {
            snowrunner: {
              installPath: 'D:/SnowRunner',
              profileRootPath: 'D:/SnowRunner/profiles',
              activeProfileId: 'profile-1',
              profiles: {
                'profile-1': {
                  id: 'profile-1',
                  name: 'Profile 1',
                  createdAt: '2026-01-01T00:00:00.000Z',
                  updatedAt: '2026-01-01T00:00:00.000Z',
                },
              },
            },
          },
        },
      },
    };

    let settings = addModToProfile(settingsWithProfile, 'steam', 'snowrunner', 'profile-1', {
      id: 'installed-mod',
      name: 'Installed Mod',
      sourceFolderPath: 'D:/mods/installed-mod',
      importedAt: '2026-01-01T00:00:00.000Z',
      installState: 'installed',
    });
    settings = addModToProfile(settings, 'steam', 'snowrunner', 'profile-1', {
      id: 'subscribed-mod',
      name: 'Subscribed Mod',
      sourceFolderPath: '',
      importedAt: '2026-01-01T00:00:00.000Z',
      installState: 'subscribed',
      modioModId: 200,
      modioProfileUrl: 'https://mod.io/g/snowrunner/m/subscribed-mod',
    });

    (component as unknown as { settings: AppSettings }).settings = settings;
    component.profiles = [
      {
        id: 'profile-1',
        name: 'Profile 1',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ];

    expect(component.installedMods.map((mod) => mod.id)).toEqual(['installed-mod']);
    expect(component.subscribedMods.map((mod) => mod.id)).toEqual(['subscribed-mod']);
  });

  it('keeps installed subscribed mods visible in subscribedCatalogItems', () => {
    const component = new ModsPageComponent();
    const settingsWithProfile = {
      ...DEFAULT_SETTINGS,
      stores: {
        steam: {
          games: {
            snowrunner: {
              installPath: 'D:/SnowRunner',
              profileRootPath: 'D:/SnowRunner/profiles',
              activeProfileId: 'profile-1',
              profiles: {
                'profile-1': {
                  id: 'profile-1',
                  name: 'Profile 1',
                  createdAt: '2026-01-01T00:00:00.000Z',
                  updatedAt: '2026-01-01T00:00:00.000Z',
                },
              },
            },
          },
        },
      },
    };

    (component as unknown as { settings: AppSettings }).settings = addModToProfile(
      settingsWithProfile,
      'steam',
      'snowrunner',
      'profile-1',
      {
        id: 'real-life-mod',
        name: 'Real Life Mod',
        sourceFolderPath: 'D:/mods/real-life-mod',
        importedAt: '2026-01-01T00:00:00.000Z',
        installState: 'installed',
        approvedModId: 'real-life-mod',
        modioModId: 182067,
      },
    );
    component.modioMods = [
      {
        id: 182067,
        name: 'Real Life Mod',
        summary: 'Official mod.io summary',
        profileUrl: 'https://mod.io/g/snowrunner/m/real-life-mod',
        thumbnailUrl: 'https://cdn.example/thumb.jpg',
        downloadUrl: 'https://cdn.example/mod.zip',
        modfileId: 222,
        modfileVersion: '2.0.0',
        tags: ['Gameplay'],
        dateUpdated: 1700000000,
        downloadsTotal: 10,
        subscribersTotal: 5,
      },
    ];
    component.profiles = [
      {
        id: 'profile-1',
        name: 'Profile 1',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ];

    expect(component.subscribedCatalogItems).toHaveLength(1);
    expect(component.isCatalogItemInstalled(component.subscribedCatalogItems[0])).toBe(true);
  });

  it('prefers installed mod entry when subscribed and installed copies share a mod.io id', () => {
    const component = new ModsPageComponent();
    const settingsWithProfile = {
      ...DEFAULT_SETTINGS,
      stores: {
        steam: {
          games: {
            snowrunner: {
              installPath: 'D:/SnowRunner',
              profileRootPath: 'D:/SnowRunner/profiles',
              activeProfileId: 'profile-1',
              profiles: {
                'profile-1': {
                  id: 'profile-1',
                  name: 'Profile 1',
                  createdAt: '2026-01-01T00:00:00.000Z',
                  updatedAt: '2026-01-01T00:00:00.000Z',
                },
              },
            },
          },
        },
      },
    };

    let settings = addModToProfile(settingsWithProfile, 'steam', 'snowrunner', 'profile-1', {
      id: 'modio-182067',
      name: 'Real Life Mod',
      sourceFolderPath: '',
      importedAt: '2026-01-01T00:00:00.000Z',
      installState: 'subscribed',
      modioModId: 182067,
      modioProfileUrl: 'https://mod.io/g/snowrunner/m/real-life-mod',
    });
    settings = addModToProfile(settings, 'steam', 'snowrunner', 'profile-1', {
      id: 'real-life-mod',
      name: 'Real Life Mod',
      sourceFolderPath: 'D:/mods/real-life-mod',
      importedAt: '2026-01-01T00:00:00.000Z',
      installState: 'installed',
      approvedModId: 'real-life-mod',
      modioModId: 182067,
      modioProfileUrl: 'https://mod.io/g/snowrunner/m/real-life-mod',
    });

    (component as unknown as { settings: AppSettings }).settings = settings;
    component.modioMods = [
      {
        id: 182067,
        name: 'Real Life Mod',
        summary: 'Official mod.io summary',
        profileUrl: 'https://mod.io/g/snowrunner/m/real-life-mod',
        thumbnailUrl: 'https://cdn.example/thumb.jpg',
        downloadUrl: 'https://cdn.example/mod.zip',
        modfileId: 222,
        modfileVersion: '2.0.0',
        tags: ['Gameplay'],
        dateUpdated: 1700000000,
        downloadsTotal: 10,
        subscribersTotal: 5,
      },
    ];
    component.profiles = [
      {
        id: 'profile-1',
        name: 'Profile 1',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ];

    expect(component.isCatalogItemInstalled(component.subscribedCatalogItems[0])).toBe(true);
  });

  it('treats merged approved item as installed when only mod.io-linked installed entry exists', () => {
    const component = new ModsPageComponent();
    const settingsWithProfile = {
      ...DEFAULT_SETTINGS,
      stores: {
        steam: {
          games: {
            snowrunner: {
              installPath: 'D:/SnowRunner',
              profileRootPath: 'D:/SnowRunner/profiles',
              activeProfileId: 'profile-1',
              profiles: {
                'profile-1': {
                  id: 'profile-1',
                  name: 'Profile 1',
                  createdAt: '2026-01-01T00:00:00.000Z',
                  updatedAt: '2026-01-01T00:00:00.000Z',
                },
              },
            },
          },
        },
      },
    };

    (component as unknown as { settings: AppSettings }).settings = addModToProfile(
      settingsWithProfile,
      'steam',
      'snowrunner',
      'profile-1',
      {
        id: 'modio-182067',
        name: 'Real Life Mod',
        sourceFolderPath: 'D:/mods/modio-182067',
        importedAt: '2026-01-01T00:00:00.000Z',
        installState: 'installed',
        modioModId: 182067,
        modioProfileUrl: 'https://mod.io/g/snowrunner/m/real-life-mod',
      },
    );
    component.modioMods = [
      {
        id: 182067,
        name: 'Real Life Mod',
        summary: 'Official mod.io summary',
        profileUrl: 'https://mod.io/g/snowrunner/m/real-life-mod',
        thumbnailUrl: 'https://cdn.example/thumb.jpg',
        downloadUrl: 'https://cdn.example/mod.zip',
        modfileId: 222,
        modfileVersion: '2.0.0',
        tags: ['Gameplay'],
        dateUpdated: 1700000000,
        downloadsTotal: 10,
        subscribersTotal: 5,
      },
    ];
    component.profiles = [
      {
        id: 'profile-1',
        name: 'Profile 1',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ];

    expect(component.subscribedCatalogItems).toHaveLength(1);
    expect(component.isCatalogItemInstalled(component.subscribedCatalogItems[0])).toBe(true);
  });

  it('marks installed mod update available when mod.io file id changes', () => {
    const component = new ModsPageComponent();
    const settingsWithProfile = {
      ...DEFAULT_SETTINGS,
      stores: {
        steam: {
          games: {
            snowrunner: {
              installPath: 'D:/SnowRunner',
              profileRootPath: 'D:/SnowRunner/profiles',
              activeProfileId: 'profile-1',
              profiles: {
                'profile-1': {
                  id: 'profile-1',
                  name: 'Profile 1',
                  createdAt: '2026-01-01T00:00:00.000Z',
                  updatedAt: '2026-01-01T00:00:00.000Z',
                },
              },
            },
          },
        },
      },
    };

    (component as unknown as { settings: AppSettings }).settings = addModToProfile(
      settingsWithProfile,
      'steam',
      'snowrunner',
      'profile-1',
      {
        id: 'real-life-mod',
        name: 'Real Life Mod',
        sourceFolderPath: 'D:/mods/real-life-mod',
        importedAt: '2026-01-01T00:00:00.000Z',
        installState: 'installed',
        approvedModId: 'real-life-mod',
        modioModId: 182067,
        modioFileId: 111,
      },
    );
    component.modioMods = [
      {
        id: 182067,
        name: 'Real Life Mod',
        summary: 'Official mod.io summary',
        profileUrl: 'https://mod.io/g/snowrunner/m/real-life-mod',
        thumbnailUrl: 'https://cdn.example/thumb.jpg',
        downloadUrl: 'https://cdn.example/mod.zip',
        modfileId: 222,
        modfileVersion: '2.0.0',
        tags: ['Gameplay'],
        dateUpdated: 1700000000,
        downloadsTotal: 10,
        subscribersTotal: 5,
      },
    ];
    component.profiles = [
      {
        id: 'profile-1',
        name: 'Profile 1',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ];

    expect(component.isUpdateAvailable(component.installedMods[0])).toBe(true);
  });

  it('filters online catalog items by selected category', () => {
    const component = new ModsPageComponent();
    component.activeTab = 'online';
    component.modioMods = [
      {
        id: 101,
        name: 'Mud Master',
        summary: 'Mud tuning',
        profileUrl: 'https://mod.io/g/snowrunner/m/mud-master',
        thumbnailUrl: '',
        downloadUrl: 'https://cdn.example/mud.zip',
        tags: ['Gameplay'],
        dateUpdated: 1700000000,
        downloadsTotal: 11,
        subscribersTotal: 4,
      },
      {
        id: 102,
        name: 'Visual Pack',
        summary: 'Visual changes',
        profileUrl: 'https://mod.io/g/snowrunner/m/visual-pack',
        thumbnailUrl: '',
        downloadUrl: 'https://cdn.example/visual.zip',
        tags: ['Visual'],
        dateUpdated: 1700000000,
        downloadsTotal: 8,
        subscribersTotal: 2,
      },
    ];

    expect(component.filteredOnlineCatalogItems).toHaveLength(3);
    component.toggleCategoryFilter('gameplay', true);

    expect(component.filteredOnlineCatalogItems.map((item) => item.name)).toContain('Mud Master');
    expect(component.filteredOnlineCatalogItems.map((item) => item.name)).not.toContain('Visual Pack');
  });

  it('filters installed mods by category from linked catalog item', () => {
    const component = new ModsPageComponent();
    const settingsWithProfile = {
      ...DEFAULT_SETTINGS,
      stores: {
        steam: {
          games: {
            snowrunner: {
              installPath: 'D:/SnowRunner',
              profileRootPath: 'D:/SnowRunner/profiles',
              activeProfileId: 'profile-1',
              profiles: {
                'profile-1': {
                  id: 'profile-1',
                  name: 'Profile 1',
                  createdAt: '2026-01-01T00:00:00.000Z',
                  updatedAt: '2026-01-01T00:00:00.000Z',
                },
              },
            },
          },
        },
      },
    };

    (component as unknown as { settings: AppSettings }).settings = addModToProfile(
      settingsWithProfile,
      'steam',
      'snowrunner',
      'profile-1',
      {
        id: 'modio-101',
        name: 'Mud Master',
        sourceFolderPath: 'D:/mods/modio-101',
        importedAt: '2026-01-01T00:00:00.000Z',
        installState: 'installed',
        modioModId: 101,
      },
    );
    component.modioMods = [
      {
        id: 101,
        name: 'Mud Master',
        summary: 'Mud tuning',
        profileUrl: 'https://mod.io/g/snowrunner/m/mud-master',
        thumbnailUrl: '',
        downloadUrl: 'https://cdn.example/mud.zip',
        tags: ['Gameplay'],
        dateUpdated: 1700000000,
        downloadsTotal: 11,
        subscribersTotal: 4,
      },
    ];
    component.profiles = [
      {
        id: 'profile-1',
        name: 'Profile 1',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ];

    expect(component.filteredInstalledMods).toHaveLength(1);
    component.toggleCategoryFilter('visual', true);
    expect(component.filteredInstalledMods).toHaveLength(0);
    component.clearCategoryFilters();
    component.toggleCategoryFilter('gameplay', true);
    expect(component.filteredInstalledMods).toHaveLength(1);
  });
});
