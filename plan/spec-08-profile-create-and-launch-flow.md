# Spec 08 — Profile Create and Launch Flow

## Goal
Enable users to create and name profiles from the Profiles page, set an active profile,
and launch the game from that active profile context.

## Scope
- Add profile create/select interactions to Profiles UI.
- Gate launch by active profile + configured game install path.
- Use Tauri opener plugin to launch the game executable path.
- Keep deployment/execution logic pure where possible.

## Acceptance Criteria

### AC-01 Create named profile from UI
- User can type a profile name and create it.
- Empty or whitespace-only names are rejected.
- Name is trimmed before save.

### AC-02 Select active profile from UI
- User can mark one profile as active.
- Active profile id persists via existing settings storage.

### AC-03 Launch readiness gating
- Launch is blocked when no active profile is selected.
- Launch is blocked when install path for active store/game is empty.
- Launch is allowed only when active profile exists and install path is configured.

### AC-04 Launch path derivation
- Game executable path is derived as `<installPath>/SnowRunner.exe`.
- Path normalization handles trailing slash and backslashes.

### AC-05 Launch action wiring
- Profiles page launch action calls a launcher bridge using the derived executable path.
- UI surfaces success/failure status message.

## Files to Add / Update
- `app/src/app/profiles-page.logic.ts` (new)
- `app/src/app/profiles-page.logic.spec.ts` (new)
- `app/src/app/launcher.bridge.ts` (new)
- `app/src/app/profiles-page.component.ts` (update)

## Out of Scope
- Deep validation of executable existence on disk
- Multi-game selectable launch matrix
- Full deploy pipeline execution from Profiles page
