import { invoke } from "@tauri-apps/api/core";
import type { InstallStrategy } from "./mod.types";

/**
 * Maps every Tauri command name to its return type.
 * This is the single source of truth for the command vocabulary.
 * Add a new entry here whenever a new command is defined in src-tauri/src/lib.rs.
 */
export interface CommandMap {
  ping: string;
  launch_game: null;
  download_and_extract_zip: string;
  deploy_launch_restore: null;
  sync_mod_catalog: null;
  search_mod_catalog: CatalogDbEntryRecord[];
  upsert_profile_mod_selection: null;
  get_profile_mod_selections: ProfileModSelectionRecord[];
}

export interface CatalogDbEntryRecord {
  id: string;
  name: string;
  description: string;
  modIoUrl: string;
  downloadUrl: string;
  baseInstallStepsJson: string;
  optionsJson: string;
}

export interface CatalogDbEntryInput {
  id: string;
  name: string;
  description: string;
  modIoUrl: string;
  downloadUrl: string;
  baseInstallStepsJson: string;
  optionsJson: string;
}

export interface ProfileModSelectionRecord {
  modId: string;
  selectedOptionsJson: string;
}

export type CommandName = keyof CommandMap;

export interface CommandArgsMap {
  ping: undefined;
  launch_game: {
    executablePath: string;
  };
  download_and_extract_zip: {
    url: string;
    destinationPath: string;
  };
  deploy_launch_restore: {
    executablePath: string;
    installRootPath: string;
    backups: Array<{ targetPath: string; backupPath: string }>;
    copies: Array<{ sourcePath: string; targetPath: string; installStrategy: InstallStrategy }>;
  };
  sync_mod_catalog: {
    entries: CatalogDbEntryInput[];
  };
  search_mod_catalog: {
    query: string;
    limit?: number;
  };
  upsert_profile_mod_selection: {
    profileId: string;
    modId: string;
    selectedOptionsJson: string;
  };
  get_profile_mod_selections: {
    profileId: string;
  };
}

/** Typed invoke signature constrained to registered commands and their return types. */
export type TauriInvokeFn = <C extends CommandName>(
  command: C,
  args?: CommandArgsMap[C],
) => Promise<CommandMap[C]>;

/** All registered command names, available at runtime for validation. */
export const registeredCommands: ReadonlyArray<CommandName> = [
  "ping",
  "launch_game",
  "download_and_extract_zip",
  "deploy_launch_restore",
  "sync_mod_catalog",
  "search_mod_catalog",
  "upsert_profile_mod_selection",
  "get_profile_mod_selections",
] as const;

/**
 * Production adapter: the only file that may import from @tauri-apps/api/core.
 * All other code calls Tauri through this adapter.
 */
export const tauriInvoke: TauriInvokeFn = <C extends CommandName>(
  command: C,
  args?: CommandArgsMap[C],
) => invoke<CommandMap[C]>(command, args);
