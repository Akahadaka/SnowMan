# Spec 07 — Controlled Deploy, Launch, Restore

## Goal
Add a controlled execution layer that gates deploy and launch behind a successful
safety dry-run, and supports restore planning from generated backups.

## Scope
- Pure TypeScript orchestration (no physical file copy/restore yet).
- Deploy orchestration consumes `runSafetyDryRun` output.
- Launch orchestration is blocked when dry-run has errors.
- Restore orchestration plans restore operations from recorded backups.

## Domain Types

```ts
export interface BackupRecord {
  targetPath: string;
  backupPath: string;
  createdAt: string;
}

export interface DeployExecutionResult {
  status: "blocked" | "planned";
  dryRun: SafetyDryRunReport;
  plannedBackups: BackupRecord[];
  plannedCopies: PlannedCopyOperation[];
}

export interface LaunchExecutionResult {
  status: "blocked" | "ready";
  reason?: string;
}

export interface RestoreExecutionResult {
  status: "none" | "planned";
  plannedRestores: Array<{ backupPath: string; targetPath: string }>;
}
```

## Rules
1. Deploy:
   - Always run dry-run first.
   - If dry-run has any `error`, return `blocked` and plan nothing.
   - If dry-run passes, return `planned` with backup records for each planned backup.
2. Launch:
   - Launch is `blocked` when deploy dry-run cannot proceed.
   - Launch is `ready` only when dry-run can proceed.
3. Restore:
   - Build restore plan from backup records.
   - When no backups are provided, return `status = none`.

## Acceptance Criteria

### AC-01 Deploy blocked on safety errors
- Any dry-run error returns `DeployExecutionResult.status = blocked`.
- `plannedBackups` and `plannedCopies` are empty.

### AC-02 Deploy planning on safe dry-run
- Safe candidates return `status = planned`.
- `plannedCopies` mirrors dry-run planned copies.
- `plannedBackups` contains one generated backup record per dry-run backup target.

### AC-03 Launch gating
- `evaluateLaunchReadiness` returns `blocked` when dry-run cannot proceed.
- Returns `ready` when dry-run can proceed.

### AC-04 Restore planning
- `planRestore` returns restore operations from backup records.
- Empty backup list yields `status = none`.

### AC-05 Deterministic backup naming
- Backup path generation is deterministic for a provided timestamp seed.

## Files to Create
- `app/src/app/deploy-execution.types.ts`
- `app/src/app/deploy-execution.ts`
- `app/src/app/deploy-execution.spec.ts`

## Out of Scope
- Actual file I/O for deploy/restore
- Game process launch command execution
- Rollback on partial failures (future iteration)
