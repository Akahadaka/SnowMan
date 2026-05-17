# Spec 11 - mod.io Catalog Browse/Search

## Goal

Add live mod.io catalog browsing and search to the Online tab so users can discover
mods from mod.io directly in-app while preserving the existing approved-mod install
workflow from previous iterations.

---

## Acceptance Criteria

### AC-01 mod.io catalog service

- Add a pure TypeScript service (`modio-catalog.service.ts`) that can:
  - Build a mod.io browse URL for a game id and API key.
  - Fetch catalog data from mod.io list endpoint.
  - Map API payloads into a typed view model for UI use.
  - Apply case-insensitive client-side search filtering on name/summary/tags.
- Service must accept an injected `fetch` function for deterministic tests.

### AC-02 Online tab shows live mod.io results

- Mods page Online tab displays live mod.io results list (name, summary, tags,
  updated/download stats where available).
- Search input filters live results using the service.
- UI keeps existing approved-mod managed install list for curated installs.

### AC-03 Error and loading states

- Online tab shows loading state while fetching mod.io results.
- If mod.io cannot be queried (missing API key or network/HTTP error), show a
  non-crashing warning message and continue showing curated approved mods.

### AC-04 Safety of existing flows

- Existing approved mod download/install flow remains unchanged.
- Existing tests for approved-mod logic and mods page remain green after update.

---

## Out of Scope

- OAuth auth and subscription sync (Iteration 12).
- Installing arbitrary mod.io mods directly (still curated install path only).
- Server-side pagination UI (client-side list with fixed fetch limit is sufficient here).

---

## Test Files

- `app/src/app/modio-catalog.service.spec.ts` - service URL/mapping/filtering tests.
- Existing suite remains green (`mods-page.component.spec.ts`, etc.).
