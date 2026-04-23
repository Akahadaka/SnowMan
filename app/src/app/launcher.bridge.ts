import { tauriInvoke } from "./tauri.bridge";
import type { BackupRecord } from "./deploy-execution.types";
import type { PlannedCopyOperation } from "./safety-dry-run.types";

export async function launchExecutable(executablePath: string): Promise<boolean> {
  try {
    await tauriInvoke("launch_game", { executablePath });
    return true;
  } catch {
    return false;
  }
}

export async function launchWithManagedDeploy(
  executablePath: string,
  installRootPath: string,
  backups: BackupRecord[],
  copies: PlannedCopyOperation[],
): Promise<boolean> {
  try {
    await tauriInvoke("deploy_launch_restore", {
      executablePath,
      installRootPath,
      backups: backups.map((entry) => ({
        targetPath: entry.targetPath,
        backupPath: entry.backupPath,
      })),
      copies: copies.map((entry) => ({
        sourcePath: entry.sourcePath,
        targetPath: entry.targetPath,
      })),
    });
    return true;
  } catch {
    return false;
  }
}
