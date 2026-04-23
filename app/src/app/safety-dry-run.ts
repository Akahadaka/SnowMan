import type {
  DeployCandidate,
  PlannedBackupOperation,
  PlannedCopyOperation,
  SafetyDryRunReport,
  SafetyIssue,
} from "./safety-dry-run.types";

const PROTECTED_FILES = new Set(["snowrunner.exe", "engine.pak"]);

function normalizeTargetPath(value: string): string {
  return value
    .replace(/\\+/g, "/")
    .replace(/^\/+|\/+$/g, "")
    .toLowerCase();
}

function hasTraversal(value: string): boolean {
  return value.split("/").some((segment) => segment === "..");
}

function isProtectedTarget(normalizedPath: string): boolean {
  const parts = normalizedPath.split("/");
  const filename = parts[parts.length - 1] ?? "";
  return PROTECTED_FILES.has(filename);
}

export function runSafetyDryRun(candidates: DeployCandidate[]): SafetyDryRunReport {
  const plannedCopies: PlannedCopyOperation[] = [];
  const plannedBackups: PlannedBackupOperation[] = [];
  const issues: SafetyIssue[] = [];

  const targetMap = new Map<string, string[]>();

  for (const candidate of candidates) {
    const normalizedTargetPath = normalizeTargetPath(candidate.relativeTargetPath.trim());

    if (!normalizedTargetPath) {
      issues.push({
        code: "empty-target",
        message: "Target path is empty.",
        modId: candidate.modId,
        severity: "error",
      });
      continue;
    }

    if (hasTraversal(normalizedTargetPath)) {
      issues.push({
        code: "path-traversal",
        message: `Path traversal detected for target '${candidate.relativeTargetPath}'.`,
        targetPath: normalizedTargetPath,
        modId: candidate.modId,
        severity: "error",
      });
    }

    if (isProtectedTarget(normalizedTargetPath)) {
      issues.push({
        code: "protected-target",
        message: `Protected target '${normalizedTargetPath}' cannot be modified.`,
        targetPath: normalizedTargetPath,
        modId: candidate.modId,
        severity: "error",
      });
    }

    const existing = targetMap.get(normalizedTargetPath) ?? [];
    targetMap.set(normalizedTargetPath, [...existing, candidate.modId]);

    plannedCopies.push({
      modId: candidate.modId,
      sourcePath: candidate.sourcePath,
      targetPath: normalizedTargetPath,
      needsBackup: candidate.targetExists,
    });

    if (candidate.targetExists) {
      plannedBackups.push({
        targetPath: normalizedTargetPath,
      });
    }
  }

  for (const [targetPath, modIds] of targetMap.entries()) {
    const uniqueModIds = [...new Set(modIds)];
    if (uniqueModIds.length <= 1) {
      continue;
    }

    for (const modId of uniqueModIds) {
      issues.push({
        code: "target-collision",
        message: `Multiple mods target '${targetPath}'.`,
        targetPath,
        modId,
        severity: "error",
      });
    }
  }

  return {
    canProceed: !issues.some((issue) => issue.severity === "error"),
    plannedCopies,
    plannedBackups,
    issues,
  };
}
