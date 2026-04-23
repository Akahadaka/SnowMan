# Backlog / Out-of-Scope Ideas

Items captured here were identified during development but deferred.
Review and prioritise at the end of the initial development phase.

---

## Game Discovery

- **Scan Steam library folders for custom install locations**
  Steam stores all user-configured library roots in `libraryfolders.vdf`
  (typically `C:/Program Files (x86)/Steam/steamapps/libraryfolders.vdf`).
  Parsing this file and appending `steamapps/common/<GameName>` to each root
  would let us auto-discover installs on drives like `D:\SteamLibrary\`
  without requiring the user to manually enter a path.
  _Raised during Iteration 04._

## Save Management

- **Add save file versioning and rollback history**
  Track timestamped versions of backed-up save data so users can inspect and
  restore older save states, not just the most recent backup. This would allow
  safer experimentation with profiles and deployments when mod changes affect
  game progression or save compatibility. Extend this to watch the active save
  directory while the game is running, detect periodic save-file updates
  (roughly every 10 minutes), and keep a rolling version history automatically
  after launch.
  _Raised during Iteration 07._

## Mod Compatibility

- **Detect file-level conflicts between mods and smart-merge when possible**
  When two mods both modify the same game file, detect whether their changes
  can be cleanly merged (e.g. non-overlapping XML entries, purely additive
  changes). If a clean merge is possible, automatically merge them and allow
  both mods to co-exist in the same profile. If the changes are genuinely
  incompatible, show a clear warning when the user attempts to add the
  conflicting mod to a profile that already contains a mod touching the same
  file. This conflict-warning behavior should be the default conservative
  posture of the app — when in doubt, warn rather than silently overwrite.
  Depends on the save file versioning / history system (see Save Management)
  as baseline context for change detection.
  _Raised during Iteration 07._

## mod.io Metadata and Updates

- **Import mod.io metadata into local mod entries (English-first)**
  For mods tracked by mod.io URL or mod ID, fetch and store canonical metadata
  from mod.io (name, summary, description_plaintext, tags, stats, author,
  profile_url, current modfile version, file_id, date_updated). Prefer English
  text where available for local display and search indexing.

  For manual-install mods (for example mods tagged `Manual` with install steps
  in description), capture structured install guidance from description text and
  mark the mod as manual-install so the UI can show recipe/checklist behavior
  instead of one-click install expectations.
  _Raised during Iteration 09._

- **Monitor subscribed mods on app startup and auto-download updates**
  On app open, sync only the authenticated user's subscribed mods (not the full
  game catalog) and compare local installed `file_id/version` against latest
  modfile data from mod.io. Queue and auto-download updates for subscribed mods
  only, with per-mod controls (auto, notify-only, ignore version) and bandwidth
  safeguards.

  Keep this conservative by default: do not install updates that require manual
  patching steps without explicit user confirmation; instead show update-available
  state and required manual actions.
  _Raised during Iteration 09._
