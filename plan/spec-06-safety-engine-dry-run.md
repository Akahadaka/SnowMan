# Spec 06 — Safety Engine Dry-Run

## Goal
Introduce a deterministic safety preflight engine that analyzes a proposed mod deployment
without touching the file system, then reports whether deployment is safe to continue.

## Scope
- Pure TypeScript dry-run planner only (no real file copy/delete operations).
- Input is a list of planned file writes with metadata.
- Output is a report containing planned operations, risk findings, and proceed/no-proceed status.

## Domain Types

```ts
export interface DeployCandidate {
  modId: string;
  sourcePath: string;
  relativeTargetPath: string;
  targetExists: boolean;
}

export interface PlannedCopyOperation {
  modId: string;
  sourcePath: string;
  targetPath: string;
  needsBackup: boolean;
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
```

## Rules
1. Reject empty target paths.
2. Reject path traversal (`..`) in `relativeTargetPath`.
3. Reject writes to protected targets:
   - `SnowRunner.exe`
   - `engine.pak`
4. Detect collisions where multiple mods target the same normalized path.
5. Plan backup operations for every candidate where `targetExists = true`.
6. `canProceed` is `false` if any `error` severity issue exists.

## Acceptance Criteria

### AC-01 Safe plan
- A valid non-colliding candidate list returns `canProceed = true`.
- `plannedCopies` contains one entry per candidate.

### AC-02 Backup planning
- Existing targets (`targetExists = true`) create backup operations.

### AC-03 Path traversal detection
- Any candidate with traversal segments is flagged with `path-traversal` error.
- `canProceed = false`.

### AC-04 Protected target detection
- Protected files are flagged with `protected-target` error.
- `canProceed = false`.

### AC-05 Collision detection
- Multiple mods targeting same path are flagged with `target-collision` errors.
- `canProceed = false`.

### AC-06 Normalization behavior
- Path normalization treats `mods\\x.pak` and `mods/x.pak` as same target for collisions.

## Files to Create
- `app/src/app/safety-dry-run.types.ts`
- `app/src/app/safety-dry-run.ts`
- `app/src/app/safety-dry-run.spec.ts`

## Out of Scope
- Physical file I/O or rollback
- Hash/diff validation
- Deploy execution hooks (Iteration 07)
