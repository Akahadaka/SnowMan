import { describe, expect, it } from 'vitest';
import { getAppTitle } from './ping.bridge';
import { shellNavigationItems } from './shell.navigation';

describe('app shell configuration', () => {
  it('exposes Snowman branding and profile-centric navigation items', () => {
    expect(getAppTitle()).toBe('SnowMan');
    expect(shellNavigationItems).toEqual([
      { label: 'Profiles', path: '/profiles' },
      { label: 'Mods', path: '/mods' },
      { label: 'Settings', path: '/settings' },
    ]);
  });
});
