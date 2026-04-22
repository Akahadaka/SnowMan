# Iteration 03 - Settings and Persistence Foundation

## Goal
Introduce a typed settings model with durable persistence and a minimal Settings UI that can load, edit, and save settings.

## Problem
The current Settings route is a placeholder with no state model and no persistence. Future iterations need a stable, typed settings contract for game path discovery, launch behavior, and safety workflows.

## Acceptance Criteria
- [x] Add typed settings model with defaults.
- [x] Add persistence module with pure functions:
  - [x] `loadSettings(storage)` returns persisted settings or defaults.
  - [x] `saveSettings(storage, settings)` writes serialized settings.
  - [x] `mergeSettings(partial, base)` applies partial patches safely.
- [x] Add tests for defaults, serialization, and merge behavior.
- [x] Replace Settings placeholder with a simple form:
  - [x] `gameInstallPath`
  - [x] `autoBackupOnDeploy`
  - [x] Save button writes settings via persistence module.
  - [x] UI displays "Saved" confirmation state after successful save.
- [x] Existing tests remain green.

## Test Plan (Red -> Green)
- New: `app/src/app/settings.persistence.spec.ts`
  - fails initially because persistence module does not exist.
- New: `app/src/app/settings-page.component.spec.ts`
  - validates pure helper functions in component logic.

## Outcome
- Added `app/src/app/settings.persistence.ts` with:
  - `AppSettings`, `SettingsPatch`, `DEFAULT_SETTINGS`, and `SETTINGS_STORAGE_KEY`.
  - `loadSettings`, `saveSettings`, `mergeSettings` pure helpers.
- Added `app/src/app/settings-page.logic.ts` for UI-agnostic settings form transforms.
- Replaced the Settings placeholder route with a working form in
  `app/src/app/settings-page.component.ts` using template-driven bindings and save state.
- Added tests:
  - `app/src/app/settings.persistence.spec.ts`
  - `app/src/app/settings-page.component.spec.ts`
- Validation results:
  - `npm test`: 5 files passed, 13 tests passed.
  - `npm run lint`: passed.
  - `npm run format:check`: passed.
  - `npm run build`: passed.
