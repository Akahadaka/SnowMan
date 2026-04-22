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
