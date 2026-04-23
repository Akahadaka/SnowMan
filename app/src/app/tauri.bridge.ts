import { invoke } from "@tauri-apps/api/core";

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
    copies: Array<{ sourcePath: string; targetPath: string }>;
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
] as const;

/**
 * Production adapter: the only file that may import from @tauri-apps/api/core.
 * All other code calls Tauri through this adapter.
 */
export const tauriInvoke: TauriInvokeFn = <C extends CommandName>(
  command: C,
  args?: CommandArgsMap[C],
) => invoke<CommandMap[C]>(command, args);
