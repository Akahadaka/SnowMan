# Working Notes

Use this file for short-lived planning notes, reminders, and decisions that are not yet ready for formal docs.

## Scratchpad
- Iteration 00 branch: feature/00-hello-world-bootstrap
- Iteration 00 commit: 505ccd1
- Iteration 01 branch: feature/01-app-shell
- Iteration 02 branch: feature/02-typed-tauri-bridge
- Iteration 03 branch: feature/03-settings-persistence-foundation

## Decision Log
- Use `npm` as frontend package manager for V1 baseline.
- Use Vitest for frontend tests in Iteration 00.
- Keep app source in `app/` and planning/docs at repo root.
- Use a persistent sidebar shell with placeholder routed pages for the first app navigation skeleton.
- Use a typed settings model + pure persistence helpers before adding game-path discovery logic.

## Risks / Follow-ups
- Environment: some terminals may not have Node/NPM on PATH even when repository scripts assume it.
- Iteration 04: add game path discovery + validation on top of persisted settings foundation.
