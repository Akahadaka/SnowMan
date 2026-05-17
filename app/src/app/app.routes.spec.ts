import '@angular/compiler';
import { describe, expect, it } from 'vitest';
import { routes } from './app.routes';

describe('app routes', () => {
  it('redirects the empty path to game-select', () => {
    const redirectRoute = routes.find((route) => route.path === '');

    expect(redirectRoute?.redirectTo).toBe('game-select');
  });

  it('defines the primary top-level routes', () => {
    const paths = routes.map((route) => route.path);

    expect(paths).toEqual([
      '',
      'game-select',
      'store-select',
      'discovery-loading',
      'profiles',
      'mods',
      'settings',
    ]);
  });
});
