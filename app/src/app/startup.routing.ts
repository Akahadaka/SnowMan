import type { AppSettings } from "./settings.persistence";

/**
 * Determines the correct Angular route path to navigate to on app startup,
 * based on whether the user has completed the first-run onboarding wizard.
 *
 * - First-run (onboardingComplete: false): guided flow starting at /game-select
 * - Returning user (onboardingComplete: true): go straight to /profiles
 */
export function resolveStartupRoute(settings: AppSettings): string {
  if (settings.onboardingComplete) {
    return "/profiles";
  }
  return "/game-select";
}
