import { getApprovedMod } from "./approved-mods.catalog";
import { buildDeployCandidates } from "./mod.import";
import type { ModEntry } from "./mod.types";
import type { DeployCandidate } from "./safety-dry-run.types";

function normalizePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/\/$/, "");
}

export function toDownloadedModPath(installPath: string, approvedModId: string): string {
  return `${normalizePath(installPath)}/downloaded/${approvedModId}`;
}

export function buildCandidatesForApprovedMod(modEntry: ModEntry): DeployCandidate[] {
  if (!modEntry.approvedModId) {
    return [];
  }

  const approved = getApprovedMod(modEntry.approvedModId);
  if (!approved) {
    return [];
  }

  const files: string[] = [...approved.baseSourceRelativePaths];

  const selected = modEntry.selectedOptions ?? {};
  for (const option of approved.options) {
    if (selected[option.id]) {
      files.push(option.sourceRelativePath);
    }
  }

  // Build candidates with source paths under extracted folder.
  const bySource = buildDeployCandidates(modEntry, "", files, () => true);

  // Override relative targets from curated recipe (base + selected options).
  const targetMap = new Map<string, string>();
  for (const sourceRelativePath of approved.baseSourceRelativePaths) {
    targetMap.set(sourceRelativePath, approved.archiveTargetPath);
  }
  for (const option of approved.options) {
    if (selected[option.id]) {
      targetMap.set(option.sourceRelativePath, option.relativeTargetPath);
    }
  }

  return bySource.map((candidate) => ({
    ...candidate,
    relativeTargetPath: targetMap.get(candidate.relativeTargetPath) ?? candidate.relativeTargetPath,
    targetExists: true,
  }));
}
