# Working Notes

Use this file for short-lived planning notes, reminders, and decisions that are not yet ready for formal docs.

## Scratchpad
- Iteration 00 branch: feature/00-hello-world-bootstrap
- Iteration 00 commit: 505ccd1
- Iteration 01 branch: feature/01-app-shell
- Iteration 02 branch: feature/02-typed-tauri-bridge
- Iteration 03 branch: feature/03-settings-persistence-foundation
- Iteration 04 branch: feature/04-game-discovery-architecture
- Iteration 05 branch: feature/05-profiles-crud
- Iteration 06 branch: feature/06-safety-engine-dry-run
- Iteration 07 branch: feature/07-controlled-deploy-launch-restore

## Decision Log
- Use `npm` as frontend package manager for V1 baseline.
- Use Vitest for frontend tests in Iteration 00.
- Keep app source in `app/` and planning/docs at repo root.
- Use a persistent sidebar shell with placeholder routed pages for the first app navigation skeleton.
- Use a typed settings model + pure persistence helpers before adding game-path discovery logic.
- Build discovery as a game-provider architecture: SnowRunner implementation first, but generic contracts from day one.
- Make profiles and persisted game paths game-aware (`gameId` namespacing) to support multi-game expansion.
- Safety dry-run should be pure and deterministic: report risks before deploy, no file I/O in Iteration 06.
- Controlled deploy/launch/restore should compose dry-run results and remain pure until file I/O lands.

## Backlog
- Out-of-scope ideas are tracked in `plan/todo.md`. Add to it as they arise; review and prioritise at the end of the initial development phase.

## Risks / Follow-ups
- Environment: some terminals may not have Node/NPM on PATH even when repository scripts assume it.
- Iteration 08: add mod metadata/import so deploy candidates can come from real selected mods.
