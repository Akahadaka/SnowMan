# Spec 05 — Profiles CRUD

## Goal
Provide a complete create / read / update / delete lifecycle for named mod profiles,
namespaced by game and store so that a user can maintain independent profile sets
for their Steam and Epic installs of the same game.

## Scope
- A **Profile** represents a named snapshot of a game mod configuration.
- Profiles are keyed by `storeId + gameId + profileId`.
- This iteration covers in-memory CRUD with persistence to `localStorage`.
- No file-system operations in this iteration (deploy/restore is Iteration 07).

## Domain Types (new)

```ts
export interface Profile {
  id: string;          // UUID or user-defined slug
  name: string;        // display name, e.g. "Vanilla" or "Mudrunner Pack"
  createdAt: string;   // ISO 8601
  updatedAt: string;   // ISO 8601
  description?: string;
}

export type ProfilesMap = Record<string, Profile>;  // keyed by profile id
```

## Settings Shape Extension

Profiles are stored inside the existing per-store, per-game settings node:

```
stores.[storeId].games.[gameId].profiles   Record<string, Profile>
stores.[storeId].games.[gameId].activeProfileId  string | null
```

`StoreGameSettings` gains two optional fields:
```ts
profiles?: ProfilesMap;
activeProfileId?: string | null;
```

## Acceptance Criteria

### AC-01 Create profile
- `createProfile(settings, storeId, gameId, name)` returns updated `AppSettings`
  with a new `Profile` entry under the correct store/game node.
- The new profile has a non-empty `id`, the given `name`, and `createdAt` / `updatedAt`
  set to the same ISO timestamp.
- Creating a profile does not modify any other store/game node.

### AC-02 Read profiles
- `getProfiles(settings, storeId, gameId)` returns all profiles for that store+game
  as an array, sorted by `createdAt` ascending.
- Returns `[]` when no profiles exist yet.

### AC-03 Update profile
- `updateProfile(settings, storeId, gameId, profileId, patch)` returns updated
  `AppSettings` with `name`, `description`, and `updatedAt` changed.
- `id` and `createdAt` are immutable.
- Throws (or returns unchanged settings) when `profileId` does not exist.

### AC-04 Delete profile
- `deleteProfile(settings, storeId, gameId, profileId)` returns updated `AppSettings`
  with the profile removed.
- If the deleted profile was `activeProfileId`, `activeProfileId` is set to `null`.
- No-ops silently when `profileId` does not exist.

### AC-05 Set active profile
- `setActiveProfile(settings, storeId, gameId, profileId)` returns updated
  `AppSettings` with `activeProfileId` set.
- Setting to a non-existent id is a no-op (active stays unchanged).

### AC-06 Persistence round-trip
- A settings object with profiles survives `saveSettings` → `loadSettings` unchanged.

### AC-07 Isolation between stores
- Creating a profile under `steam / snowrunner` does not affect `epic / snowrunner`.

## Files to Create / Modify
- `app/src/app/profile.types.ts` — `Profile`, `ProfilesMap` (new)
- `app/src/app/profiles.persistence.ts` — CRUD helpers (new)
- `app/src/app/profiles.persistence.spec.ts` — all AC tests (new)
- `app/src/app/settings.persistence.ts` — extend `StoreGameSettings`

## Out of Scope
- Profile UI page (deferred)
- File-system sync of profile data (Iteration 07)
- Profile import/export
