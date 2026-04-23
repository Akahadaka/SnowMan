import type { InstallStrategy } from "./mod.types";

export interface DeployCandidate {
  modId: string;
  sourcePath: string;
  relativeTargetPath: string;
  targetExists: boolean;
  installStrategy?: InstallStrategy;
}

export interface PlannedCopyOperation {
  modId: string;
  sourcePath: string;
  targetPath: string;
  needsBackup: boolean;
  installStrategy: InstallStrategy;
}

export interface PlannedBackupOperation {
  targetPath: string;
}

export type SafetyIssueCode =
  | "path-traversal"
  | "protected-target"
  | "target-collision"
  | "empty-target";

export interface SafetyIssue {
  code: SafetyIssueCode;
  message: string;
  targetPath?: string;
  modId?: string;
  severity: "error" | "warning";
}

export interface SafetyDryRunReport {
  canProceed: boolean;
  plannedCopies: PlannedCopyOperation[];
  plannedBackups: PlannedBackupOperation[];
  issues: SafetyIssue[];
}
