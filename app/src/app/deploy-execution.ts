import { runSafetyDryRun } from './safety-dry-run';
import type { DeployCandidate, SafetyDryRunReport } from './safety-dry-run.types';
import type {
  BackupRecord,
  DeployExecutionResult,
  LaunchExecutionResult,
  RestoreExecutionResult,
} from './deploy-execution.types';

function toBackupSuffix(isoTimestamp: string): string {
  return isoTimestamp.replace(/:/g, '-');
}

function buildBackupPath(targetPath: string, isoTimestamp: string): string {
  return `${targetPath}.snowman-backup.${toBackupSuffix(isoTimestamp)}`;
}

export function executeControlledDeploy(
  candidates: DeployCandidate[],
  timestampSeed: string,
): DeployExecutionResult {
  const dryRun = runSafetyDryRun(candidates);

  if (!dryRun.canProceed) {
    return {
      status: 'blocked',
      dryRun,
      plannedBackups: [],
      plannedCopies: [],
    };
  }

  const plannedBackups: BackupRecord[] = dryRun.plannedBackups.map((backup) => ({
    targetPath: backup.targetPath,
    backupPath: buildBackupPath(backup.targetPath, timestampSeed),
    createdAt: timestampSeed,
  }));

  return {
    status: 'planned',
    dryRun,
    plannedBackups,
    plannedCopies: dryRun.plannedCopies,
  };
}

export function evaluateLaunchReadiness(dryRun: SafetyDryRunReport): LaunchExecutionResult {
  if (!dryRun.canProceed) {
    const firstError = dryRun.issues.find((issue) => issue.severity === 'error');
    return {
      status: 'blocked',
      reason: firstError?.message ?? 'Safety preflight failed.',
    };
  }

  return {
    status: 'ready',
  };
}

export function planRestore(backups: BackupRecord[]): RestoreExecutionResult {
  if (backups.length === 0) {
    return {
      status: 'none',
      plannedRestores: [],
    };
  }

  return {
    status: 'planned',
    plannedRestores: backups.map((backup) => ({
      backupPath: backup.backupPath,
      targetPath: backup.targetPath,
    })),
  };
}
