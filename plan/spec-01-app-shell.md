# Spec 01 - App Shell and Navigation Skeleton

## Purpose
Deliver the first real application shell so Snowman has a stable desktop layout, basic branded identity, and placeholder navigation for future features.

## Scope
- Replace the Iteration 00 placeholder page with a branded app shell.
- Add primary navigation links for the first top-level areas.
- Add placeholder routed pages for each top-level area.
- Update visible app identity from generic scaffold naming to Snowman in the UI.

## Required Workflow For This Iteration
1. Create test files first for all listed behaviors.
2. Run tests before implementation and confirm expected failures.
3. Implement functionality incrementally.
4. Re-run tests after each implementation step.
5. Continue until all tests pass.

## Non-Goals
- No real profile management logic.
- No persisted settings.
- No game discovery.
- No mod installation flows.
- No final visual polish.

## Acceptance Criteria
1. The app renders a persistent shell with Snowman branding.
2. The shell exposes navigation entries for Dashboard, Profiles, Mods, and Settings.
3. Each navigation entry maps to a routed placeholder view.
4. The default route opens Dashboard.
5. Frontend tests validate navigation structure and route coverage.
6. Existing Rust ping command remains callable from the shell.

## Deliverables
- App shell layout in the Angular frontend.
- Placeholder route components for core sections.
- Frontend tests covering shell navigation and default routing structure.
- Updated iteration notes and docs after completion.

## Test List (First PR For This Iteration)
- Navigation config test: expected labels and paths are present.
- Route config test: all top-level shell routes exist.
- Shell behavior test: app title remains Snowman and ping bridge still works.

## Exit Criteria
Iteration 01 is complete when acceptance criteria pass locally and in CI, and the app launches with the shell layout instead of the Iteration 00 placeholder screen.

## Open Questions
- Whether sidebar-only navigation is enough or if a top header action area should ship in this iteration.
- Whether branding cleanup of package identifiers should happen in Iteration 01 or later release hardening.

## Implementation Outcome
- App shell implemented with persistent sidebar navigation and routed placeholder views.
- Default route now redirects to Dashboard.
- Snowman branding remains visible at the shell level and the ping check remains available.
- Packaged Windows build verified after shell changes.
