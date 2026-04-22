# Spec 00 - Hello World Bootstrap

## Purpose
Deliver a minimal, working desktop application baseline that proves the full stack is wired correctly.

## Scope
- Initialize project structure for Tauri + Rust backend + Angular frontend.
- Launch app locally with a visible shell page.
- Wire one backend command and one frontend call path.
- Enable CI validation for build and tests.

## Required Workflow For This Iteration
1. Create test files first for all listed behaviors.
2. Run tests before implementation and confirm expected failures.
3. Implement functionality incrementally.
4. Re-run tests after each implementation step.
5. Continue until all tests pass.

## Non-Goals
- No SnowRunner file operations.
- No profile management.
- No mod.io integration.
- No production UI polish.

## Acceptance Criteria
1. The app launches in development mode and displays a page titled "Snowman".
2. Frontend can invoke a Rust command (example: `ping`) and render the response.
3. Frontend unit tests run successfully.
4. Rust tests run successfully.
5. CI workflow validates lint/test/build on pull requests.
6. Build succeeds on Windows at minimum; cross-platform matrix can be added immediately if environment supports it.

## Deliverables
- Initial app scaffold committed.
- Working `ping` command bridge (frontend <-> Rust).
- Basic test suites in frontend and Rust.
- CI workflow file for PR validation.
- Red-phase evidence showing tests failed before implementation.
- Green-phase evidence showing all tests pass after implementation.

## Test List (First PR)
- Frontend smoke test: app component renders title.
- Frontend integration test: mocked or real call path for `ping` response handling.
- Rust unit test: `ping` command returns expected value.
- Build validation: project compiles in CI.

## Exit Criteria
Iteration 00 is complete when all acceptance criteria pass in CI, local run instructions are verified by at least one clean checkout, and Red -> Green evidence is included in the PR notes.

## Open Questions
- Exact package manager choice for frontend (`npm` vs `pnpm`).
- Whether to enforce formatting checks in Iteration 00 or defer to Iteration 01.
