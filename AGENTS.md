# AGENTS Routing Guide

## Purpose
This file is the session entry point for planning and iteration work.
Use it to route to the right source quickly.
Do not duplicate full project knowledge here.

## Quick Start For Any New Session
1. Read plan overview first: plan/overview.md
2. Identify the active spec: latest plan/spec-XX-*.md
3. Read working notes for recent decisions and loose ends: memory/notes.md
4. Read docs index for published guidance status: docs/README.md
5. Only then open additional files needed for the current task

## Context Map (Read By Need)
- plan/overview.md
  - Use for: product direction, delivery model, branching, release policy, iteration roadmap
- plan/spec-XX-*.md
  - Use for: acceptance criteria and iteration-specific scope
- memory/notes.md
  - Use for: scratch decisions, risks, follow-ups, short-term reminders
- docs/README.md
  - Use for: documentation structure and update obligations each iteration

## Routing Rules
- If asked What should we build next:
  - Start with plan/overview.md and the highest numbered spec file.
- If asked Why did we choose this approach:
  - Check memory/notes.md first, then plan/overview.md.
- If asked What must pass before merge:
  - Check plan/overview.md delivery model and PR gate requirements, then active spec.
- If asked What docs need updates:
  - Start at docs/README.md, then update internal and external docs for the active iteration.

## Iteration Generation Protocol
1. Create or update the next spec file in plan before implementation.
2. Define acceptance criteria and tests for that iteration.
3. Follow mandatory Red to Green cycle:
   - Create tests first
   - Run tests and verify expected failures
   - Implement smallest viable change
   - Re-run tests until all pass
4. Record notable decisions or risks in memory/notes.md.
5. Update docs after iteration completion.

## Naming Conventions
- Specs: plan/spec-00-hello-world.md, plan/spec-01-app-shell.md, and so on
- Master plan: plan/overview.md
- Working notes: memory/notes.md
- Docs hub: docs/README.md

## Living File Policy
Update this file when global routing context changes, including:
- New planning files or major folder moves
- New required process gates
- New canonical sources for decisions, testing, release, or documentation

Keep updates concise and routing-oriented.
Avoid turning this file into a full design document.
