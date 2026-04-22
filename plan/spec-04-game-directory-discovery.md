# Iteration 04 - Game Directory Discovery and Validation

## Goal
Implement game installation directory discovery for SnowRunner while introducing a modular,
game-aware architecture that allows additional games to be added later without rewriting the
discovery flow, profile model, or validation pipeline.

## Scope
- In scope now:
  - Discovery + validation for SnowRunner only.
  - Shared discovery abstractions that support multiple games.
  - Settings integration for selected game and discovered install path.
- Out of scope now:
  - Discovery implementation for non-SnowRunner titles.
  - UI to manage multiple games simultaneously.

## Architecture Requirements

### 1) Game registry and provider contract
- Define a stable `GameId` type (starting with `snowrunner`).
- Introduce a `GameProvider` contract that encapsulates game-specific behavior:
  - discovery candidates
  - validation rules
  - profile root strategy
- Introduce a `GameRegistry` that maps `GameId` to provider implementations.
- Ensure the app selects providers via `GameId`, never by hard-coded SnowRunner checks in generic flows.

### 2) SnowRunner provider (first implementation)
- Implement `SnowRunnerProvider` behind the shared contract.
- Keep all SnowRunner-specific constants and path heuristics inside this provider module.

### 3) Game-aware profile foundation
- Profile identity and storage keys must include `gameId` to avoid cross-game collisions.
- Any persisted game path state must be namespaced by `gameId`.

### 4) Validation pipeline
- Validation runs through generic orchestration:
  - load provider from registry
  - get candidates
  - run provider-specific validators
  - return typed `DiscoveryResult`

## Acceptance Criteria
- [x] Add shared discovery domain types (`GameId`, provider interface, discovery result).
- [x] Add registry with one provider entry (`snowrunner`).
- [x] Add SnowRunner discovery + validation implementation via provider.
- [x] No generic discovery module contains SnowRunner-specific literals.
- [x] Persist discovered path in game-aware settings shape keyed by `gameId`.
- [x] Tests cover provider contract behavior and registry dispatch.

## Test Plan (Red -> Green)
- New tests for:
  - registry dispatch by `GameId`
  - SnowRunner provider validation behavior
  - game-aware settings persistence shape for discovered paths
- Red phase must show missing provider contract/registry behavior before implementation.

## Design Constraints
- Keep provider interface small and stable to reduce migration cost when adding new games.
- Prefer additive extension (register new provider) over conditional branching.

## Outcome
- Added shared discovery domain and provider contracts:
  - `app/src/app/game-discovery.types.ts`
  - `app/src/app/game-provider.ts`
- Added registry and orchestration pipeline:
  - `app/src/app/game-registry.ts`
  - `app/src/app/game-discovery.service.ts`
- Added SnowRunner-specific provider implementation:
  - `app/src/app/snowrunner.provider.ts`
- Migrated settings persistence to game-aware shape keyed by `gameId` while preserving legacy compatibility:
  - `app/src/app/settings.persistence.ts`
  - `app/src/app/settings-page.logic.ts`
  - `app/src/app/settings-page.component.ts`
- Added/updated tests:
  - `app/src/app/game-registry.spec.ts`
  - `app/src/app/game-discovery.service.spec.ts`
  - `app/src/app/snowrunner.provider.spec.ts`
  - `app/src/app/settings.persistence.spec.ts`
  - `app/src/app/settings-page.component.spec.ts`
- Validation results:
  - `npm test`: 8 files passed, 18 tests passed.
  - `npm run lint`: passed.
  - `npm run format:check`: passed.
  - `npm run build`: passed.
