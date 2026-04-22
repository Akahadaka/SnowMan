# Working Notes

Use this file for short-lived planning notes, reminders, and decisions that are not yet ready for formal docs.

## Scratchpad
- Iteration 00 branch: feature/00-hello-world-bootstrap
- Iteration 00 commit: 505ccd1
- Iteration 01 branch: feature/01-app-shell

## Decision Log
- Use `npm` as frontend package manager for V1 baseline.
- Use Vitest for frontend tests in Iteration 00.
- Keep app source in `app/` and planning/docs at repo root.
- Use a persistent sidebar shell with placeholder routed pages for the first app navigation skeleton.

## Risks / Follow-ups
- Iteration 02: add formatting/lint gates to CI.
- Iteration 02: consider branding cleanup for package/bundle identifiers and artifact names.
- Iteration 02: define typed frontend-to-Tauri command boundary instead of direct invoke usage in shell code.
