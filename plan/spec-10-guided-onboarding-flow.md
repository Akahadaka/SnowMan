# Spec 10 — Guided Onboarding Flow

## Goal

Replace the dashboard-first entry with a guided first-run flow that mirrors
r2modman's direct-to-profile UX: Game → Store → Discovery Loading → Profiles.
After completing onboarding once, the app skips the wizard and routes directly
to the last active profile context.

---

## Background

Iterations 00–09 built the core engine (settings persistence, game discovery,
profiles CRUD, safety deploy, mod import). This iteration wires them together
into a user-facing experience instead of a developer scaffold.

---

## Acceptance Criteria

### AC-01 Startup routing gate

- A pure function `resolveStartupRoute(settings)` returns the correct path string.
- Returns `/game-select` when `settings.onboardingComplete` is `false`.
- Returns `/profiles` when `settings.onboardingComplete` is `true` (regardless
  of whether an active profile exists; the profiles page handles both states).
- `AppSettings` gains an `onboardingComplete: boolean` field (default `false`).
- `DEFAULT_SETTINGS` includes `onboardingComplete: false`.
- The root redirect uses the persisted settings value, so returning users skip
  the wizard on every launch.

### AC-02 Game selection page

- A `GameSelectPageComponent` renders "Select Your Game" heading and a single
  SnowRunner card (game id `snowrunner`, label "SnowRunner").
- Clicking the card persists `selectedGameId: 'snowrunner'` to settings and
  navigates to `/store-select`.
- The card is visually selectable (has a selected state style when active).

### AC-03 Store selection page

- A `StoreSelectPageComponent` renders "Choose Store" heading and exactly two
  radio-button options: Steam (`steam`) and Epic Games Store (`epic`).
- Selecting a store and clicking "Continue" persists `selectedStoreId` to
  settings and navigates to `/discovery-loading`.
- Defaults to the last-persisted store (or Steam on first run).
- `game-context.ts` STORE_OPTIONS includes both `steam` and `epic` entries.

### AC-04 Discovery loading page

- A `DiscoveryLoadingPageComponent` renders "Finding SnowRunner…" heading and
  a status message while discovery runs.
- On mount it calls `discoverGameInstallPath` with the persisted game/store
  context from settings.
- On success (at least one valid candidate): persists the best candidate's path
  as the install path for the selected store/game, sets `onboardingComplete: true`,
  and navigates to `/profiles`.
- On not-found: shows a "Could not find SnowRunner automatically" message and
  an "Enter path manually" button that navigates to `/settings`.
- Discovery result status codes `found` / `not-found` drive the two outcome branches.

### AC-05 Onboarding persistence migration

- `loadSettings` continues to return valid defaults for settings serialized
  before iteration 10 (i.e. missing `onboardingComplete` key defaults to `false`
  without throwing).

### AC-06 Profile management page (aligned UX)

- The profiles page shows:
  - A "Back" affordance to return to game/store selection (navigates `/game-select`).
  - The current game + store context in the header area.
  - A list of existing profiles for the active store/game.
  - Create Profile (name input + button).
  - Select / set active profile via radio or click.
  - Launch modded and Launch vanilla actions.
- "Launch modded" triggers `launchWithManagedDeploy` gated by `deriveLaunchContext`.
- "Launch vanilla" triggers the launcher with no deploy; direct executable launch.

### AC-07 Mods page — installed section

- For the active profile, mods installed via the approved catalog are listed as
  "Installed".
- Each entry shows the mod name and an "Update" action that re-downloads and
  re-imports the latest approved package.
- An "Update all" button triggers re-download/re-import for every installed
  approved mod in the profile.

### AC-08 Mods page — search/browse section

- An "Online" or "Browse" section lists the approved catalog entries.
- A search text field filters catalog entries by name (case-insensitive substring).
- Clicking "Add to Profile" on a catalog entry downloads and imports it into the
  active profile (reuses existing `addApprovedMod` behavior).

### AC-09 Settings page (simplified)

- Settings page shows: install path (with Browse button), backup toggle, and
  current store/game context display.
- No store/game selector fields are shown since selection happens in onboarding.
- A "Change game / store" link navigates back to `/game-select` to re-run onboarding.

---

## Out of Scope for This Iteration

- Live mod.io browse, search, or download (deferred to Iteration 11).
- Authentication and subscription sync.
- Background update checker on startup.
- Multi-game selectable matrix.
- GOG store support.
- Mod conflict detection or smart merge.

---

## New Files

| File | Purpose |
|---|---|
| `app/src/app/startup.routing.ts` | `resolveStartupRoute` pure function |
| `app/src/app/startup.routing.spec.ts` | Unit tests for startup gate |
| `app/src/app/game-select-page.component.ts` | Game selection onboarding screen |
| `app/src/app/store-select-page.component.ts` | Store selection onboarding screen |
| `app/src/app/discovery-loading-page.component.ts` | Discovery loading and routing |

## Modified Files

| File | Change |
|---|---|
| `app/src/app/app.routes.ts` | Add onboarding routes; change default redirect to use startup gate |
| `app/src/app/app.routes.spec.ts` | Update route coverage to include new onboarding routes |
| `app/src/app/game-context.ts` | Add Epic to `STORE_OPTIONS` |
| `app/src/app/settings.persistence.ts` | Add `onboardingComplete` to `AppSettings` and `DEFAULT_SETTINGS` |
| `app/src/app/settings.persistence.spec.ts` | Tests for migration compatibility and new field |
| `app/src/app/profiles-page.component.ts` | Aligned UX per AC-06 |
| `app/src/app/mods-page.component.ts` | Installed + search sections per AC-07/AC-08 |
| `app/src/app/mods-page.component.spec.ts` | Tests for search filter and update-all |
| `app/src/app/settings-page.component.ts` | Simplified per AC-09 |
