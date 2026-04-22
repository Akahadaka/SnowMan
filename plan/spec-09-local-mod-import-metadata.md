# Spec 09 — Local Mod Import and Metadata

## Goal

Allow users to import a local mod folder (or zip archive) into a named profile.
After import, each mod entry has structured metadata and a resolved list of
`DeployCandidate` records so the deploy pipeline can work from real file selections
rather than hard-coded test fixtures.

---

## Background

`DeployCandidate` (defined in `safety-dry-run.types.ts`) requires:
- `modId` — unique identifier for the mod
- `sourcePath` — absolute path to the source file inside the mod folder
- `relativeTargetPath` — path relative to the game install root
- `targetExists` — whether the target file already exists on disk

Currently the deploy pipeline is exercised only with hand-crafted candidates.
This iteration makes imports the entry point for real candidate production.

---

## Acceptance Criteria

1. **`importModFromFolder(profileId, modFolderPath)`**
   - Reads the top-level `mod.json` manifest from `modFolderPath` if present;
     falls back to auto-deriving `id` and `name` from the folder name.
   - Returns a `ModEntry` with `id`, `name`, `sourceFolderPath`, `importedAt`, and
     an optional `description`.
   - Throws a typed `ModImportError` if `modFolderPath` is empty or blank.

2. **`buildDeployCandidates(modEntry, gameInstallPath)`**
   - Walks the mod's source folder (simulated in tests via an injected file list)
     and returns one `DeployCandidate` per file.
   - Each candidate's `relativeTargetPath` is the file path relative to `modFolderPath`.
   - `targetExists` is determined by an injected existence-checker function, defaulting
     to `false` in the pure unit test context.
   - Throws a typed `ModImportError` if `modEntry.sourceFolderPath` is empty.

3. **`addModToProfile(settings, storeId, gameId, profileId, modEntry)`**
   - Returns updated `AppSettings` with the `ModEntry` stored under
     `stores[storeId].games[gameId].profiles[profileId].mods[modId]`.
   - Idempotent: re-importing a mod with the same `id` replaces the existing entry.

4. **`getModsForProfile(settings, storeId, gameId, profileId)`**
   - Returns a `ModsMap` (or empty object) for the profile — never throws.

5. **UI: Mods page shows an import button per profile**
   - A `ModsPageComponent` stub renders a heading and an "Import Mod" button.
   - Clicking the button invokes a `(importMod)` output — no file picker wired yet.

---

## Types to Add

```ts
// mod.types.ts
export interface ModEntry {
  id: string;
  name: string;
  sourceFolderPath: string;
  importedAt: string;
  description?: string;
}

export type ModsMap = Record<string, ModEntry>;

export interface ModImportError {
  code: "empty-path" | "manifest-parse-failure";
  message: string;
}
```

`AppSettings` / `StoreGameSettings` extended:
- `profiles[profileId].mods?: ModsMap` added to the profile shape.

---

## Out of Scope for This Iteration

- Actual file-system walking (injected file list keeps tests pure)
- Zip archive unpacking
- File picker dialog integration on the Mods page
- Wiring `buildDeployCandidates` into the deploy pipeline

---

## Test Files

- `app/src/app/mod.import.spec.ts` — covers `importModFromFolder`, `buildDeployCandidates`,
  `addModToProfile`, `getModsForProfile`
- `app/src/app/mods-page.component.spec.ts` — covers the stub UI component

---

## Files to Create / Modify

| File | Action |
|---|---|
| `app/src/app/mod.types.ts` | Create — ModEntry, ModsMap, ModImportError |
| `app/src/app/mod.import.ts` | Create — import + candidate logic |
| `app/src/app/mods-page.component.ts` | Create — stub Angular component |
| `app/src/app/profile.types.ts` | Update — add `mods?: ModsMap` to Profile |
| `app/src/app/app.routes.ts` | Update — add `/mods` route |
| `app/src/app/app.component.ts` | Update — add Mods nav link |
| `app/src/app/mod.import.spec.ts` | Create — unit tests |
| `app/src/app/mods-page.component.spec.ts` | Create — component tests |
