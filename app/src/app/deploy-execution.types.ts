import type { PlannedCopyOperation, SafetyDryRunReport } from './safety-dry-run.types';

export interface BackupRecord {
  targetPath: string;
  backupPath: string;
  createdAt: string;
}

export interface DeployExecutionResult {
  status: 'blocked' | 'planned';
  dryRun: SafetyDryRunReport;
  plannedBackups: BackupRecord[];
  plannedCopies: PlannedCopyOperation[];
}

export interface LaunchExecutionResult {
  status: 'blocked' | 'ready';
  reason?: string;
}

export interface RestoreExecutionResult {
  status: 'none' | 'planned';
  plannedRestores: Array<{ backupPath: string; targetPath: string }>;
}
