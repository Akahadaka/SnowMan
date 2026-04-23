import { describe, expect, it } from "vitest";
import { resolveStartupRoute } from "./startup.routing";
import { DEFAULT_SETTINGS, mergeSettings } from "./settings.persistence";

describe("resolveStartupRoute", () => {
  it("returns /game-select when onboardingComplete is false", () => {
    const settings = mergeSettings({ onboardingComplete: false }, DEFAULT_SETTINGS);
    expect(resolveStartupRoute(settings)).toBe("/game-select");
  });

  it("returns /game-select by default for fresh settings", () => {
    expect(resolveStartupRoute(DEFAULT_SETTINGS)).toBe("/game-select");
  });

  it("returns /profiles when onboardingComplete is true", () => {
    const settings = mergeSettings({ onboardingComplete: true }, DEFAULT_SETTINGS);
    expect(resolveStartupRoute(settings)).toBe("/profiles");
  });

  it("returns /profiles even when no active profile exists after onboarding", () => {
    const settings = mergeSettings({ onboardingComplete: true }, DEFAULT_SETTINGS);
    expect(resolveStartupRoute(settings)).toBe("/profiles");
  });
});
