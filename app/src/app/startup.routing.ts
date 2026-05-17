import type { AppSettings } from './settings.persistence';

/**
 * Determines the correct Angular route path to navigate to on app startup,
 * based on whether the user has completed the first-run onboarding wizard.
 *
 * - First-run (onboardingComplete: false): guided flow starting at /game-select
 * - Returning user (onboardingComplete: true): go straight to /mods
 */
export function resolveStartupRoute(settings: AppSettings): string {
  if (settings.onboardingComplete) {
    return '/mods';
  }
  return '/game-select';
}
