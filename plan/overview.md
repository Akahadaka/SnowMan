# Snowman Master Plan

## Mission
Build a safe, profile-based SnowRunner mod manager for Windows first, with architecture that can expand to other platforms and other games later.

## Product Scope
- In scope (V1):
  - SnowRunner mod profile management
  - Safe deploy/restore workflows for game-file mods
  - mod.io catalog and authenticated install flow
  - Steam and Epic launch support
- Out of scope (V1):
  - In-app mod authoring tools
  - Linux/macOS runtime support
  - Multi-game support beyond SnowRunner

## Technical Stack
- Desktop shell: Tauri
- Core engine: Rust
- Frontend: Angular + TypeScript + Signals
- UI system: Angular Material + CDK

## Delivery Model
- Spec Driven Development (SDD): each iteration starts with an acceptance spec.
- Mandatory test-first workflow: create tests first, run them, verify intended failures, then implement.
- Every iteration must be shippable and demonstrably functional.
- CI enforces quality gates for pull requests and merge branches.

## Iteration Execution Protocol (Required)
1. Define acceptance criteria in the iteration spec.
2. Create or update test files for all new behaviors before implementation.
3. Run the test suite and verify new tests fail for the expected reason (Red phase).
4. Implement the smallest change set to satisfy failing tests.
5. Re-run all relevant tests and iterate until all tests pass (Green phase).
6. Refactor safely while keeping tests green.
7. Update docs and iteration notes, then open PR.

## PR Gate Requirements
- PRs must include evidence of Red -> Green progression for the iteration scope.
- New behavior without corresponding tests is not complete.
- No merge to develop or main with failing tests.

## Branching and Releases
- `main`: always releasable state, semantic versions only.
- `develop`: integration branch for upcoming release work.
- `feature/<iter>-<slug>`: implementation branches.
- `release/<x.y.z>`: stabilization branch.
- `hotfix/<x.y.z+1>`: urgent fix from main.

## Iteration Roadmap
- Iteration 00: Hello World bootstrap (Tauri + Angular + Rust CI smoke)
- Iteration 01: App shell and navigation skeleton
- Iteration 02: Typed Tauri command bridge
- Iteration 03: Settings and persistence foundation
- Iteration 04: Game path discovery and validation (modular provider architecture; SnowRunner-first)
- Iteration 05: Profiles CRUD
- Iteration 06: Safety engine dry-run
- Iteration 07: Controlled deploy/launch/restore
- Iteration 08: Profile create and launch flow
- Iteration 09: Local mod import and metadata
- Iteration 10: Guided onboarding flow
- Iteration 11: mod.io catalog browse/search
- Iteration 12: mod.io auth and install flow
- Iteration 13: Deployment planner + conflict checks
- Iteration 14: Release hardening and packaging

## Planning File Conventions
- `plan/overview.md`: master direction and governance
- `plan/spec-XX-*.md`: per-iteration acceptance specs
- `memory/`: working notes, decision logs, and TODO fragments
- `docs/`: polished docs updated each iteration (internal and external)
