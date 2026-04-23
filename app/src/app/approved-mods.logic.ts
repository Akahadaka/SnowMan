import { getApprovedMod } from "./approved-mods.catalog";
import { buildDeployCandidates } from "./mod.import";
import type { ApprovedModDefinition, ApprovedModInstallStep, ModEntry } from "./mod.types";
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

  return buildCandidatesForApprovedDefinition(modEntry, approved);
}

export function buildCandidatesForApprovedDefinition(
  modEntry: ModEntry,
  approved: ApprovedModDefinition,
): DeployCandidate[] {

  const selected = modEntry.selectedOptions ?? {};
  const installSteps: ApprovedModInstallStep[] = [
    ...approved.baseInstallSteps,
    ...approved.options
      .filter((option) => option.includeInDeploy !== false)
      .filter((option) => Boolean(selected[option.id]))
      .map((option) => ({
        sourceRelativePath: option.sourceRelativePath,
        relativeTargetPath: option.relativeTargetPath,
        installStrategy: option.installStrategy,
      })),
  ];

  const files = installSteps.map((step) => step.sourceRelativePath);

  // Build candidates with source paths under extracted folder.
  const bySource = buildDeployCandidates(modEntry, "", files, () => true);

  // Override relative targets from curated recipe (base + selected options).
  const stepMap = new Map<string, ApprovedModInstallStep>();
  for (const step of installSteps) {
    stepMap.set(step.sourceRelativePath, step);
  }

  return bySource.map((candidate) => ({
    ...candidate,
    relativeTargetPath:
      stepMap.get(candidate.relativeTargetPath)?.relativeTargetPath ?? candidate.relativeTargetPath,
    installStrategy: stepMap.get(candidate.relativeTargetPath)?.installStrategy,
    targetExists: true,
  }));
}
