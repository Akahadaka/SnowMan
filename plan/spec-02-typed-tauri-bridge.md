# Iteration 02 — Typed Tauri Command Bridge

## Goal
Replace the untyped `invoke<string>(command: string)` pattern with a typed command boundary
that constrains which Tauri commands can be called and what types they return.
Also establish lint and format gates in CI.

## Context
In Iteration 01 the ping call used a raw `(command: string) => Promise<string>` function
signature passed in from the component. The component imported `invoke` directly from
`@tauri-apps/api/core`. This means:
- Any string is a valid command name — typos compile silently.
- Return types are inferred via a cast, not enforced by the boundary.
- The component is coupled to the Tauri API import.

## Acceptance Criteria

### Typed bridge
- [ ] `app/src/app/tauri.bridge.ts` exports `CommandMap` interface mapping command names to
      their return types.
- [ ] `CommandMap` contains the `ping` command with return type `string`.
- [ ] `TauriInvokeFn` generic type alias is exported, constrained to keys of `CommandMap`.
- [ ] `registeredCommands` constant is exported as a readonly array of `CommandName` values.
- [ ] `tauriInvoke` is exported: the production adapter that calls Tauri's `invoke` with
      `TauriInvokeFn` typing.

### Updated consumers
- [ ] `ping.bridge.ts` uses `TauriInvokeFn` from `tauri.bridge.ts`; removes its own `InvokeFn`.
- [ ] `app.component.ts` removes the `invoke` import from `@tauri-apps/api/core`.
- [ ] `app.component.ts` uses `tauriInvoke` as the default argument and `TauriInvokeFn` as
      the parameter type.

### Tests
- [ ] `tauri.bridge.spec.ts` verifies `registeredCommands` contains `"ping"`.
- [ ] `tauri.bridge.spec.ts` verifies `fetchPing` calls the typed invokeFn with `"ping"` and
      returns the result.
- [ ] All existing tests continue to pass.

### Lint + format
- [ ] ESLint and Prettier installed as dev dependencies.
- [ ] `eslint.config.mjs` covers all TypeScript source files.
- [ ] `.prettierrc` defines project formatting rules.
- [ ] `"lint"` and `"format:check"` scripts added to `package.json`.
- [ ] `pr-validation.yml` frontend job runs lint and format check.

## Test Files
- New: `app/src/app/tauri.bridge.spec.ts`
- Modified: `app/src/app/app.component.spec.ts` (import type from tauri.bridge)
- No changes needed to `app.routes.spec.ts`

## Implementation Notes
- `CommandMap` is the single source of truth for the command vocabulary.
  Adding a new Rust command requires a matching entry here.
- `tauriInvoke` is the only file that may import from `@tauri-apps/api/core`.
- ESLint uses flat config (`eslint.config.mjs`) with `typescript-eslint` recommended rules.
- Prettier uses defaults with single quotes and no semicolons.

## Outcome
_To be filled after implementation._
