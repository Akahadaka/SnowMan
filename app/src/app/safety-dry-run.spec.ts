import { describe, expect, it } from "vitest";
import { runSafetyDryRun } from "./safety-dry-run";
import type { DeployCandidate } from "./safety-dry-run.types";

describe("safety dry-run", () => {
  it("returns canProceed=true and planned copies for safe candidates", () => {
    const candidates: DeployCandidate[] = [
      {
        modId: "mod-a",
        sourcePath: "C:/mods/mod-a/file.pak",
        relativeTargetPath: "mods/file-a.pak",
        targetExists: false,
      },
    ];

    const report = runSafetyDryRun(candidates);

    expect(report.canProceed).toBe(true);
    expect(report.plannedCopies).toHaveLength(1);
    expect(report.issues).toHaveLength(0);
  });

  it("plans backups for existing targets", () => {
    const candidates: DeployCandidate[] = [
      {
        modId: "mod-a",
        sourcePath: "C:/mods/mod-a/file.pak",
        relativeTargetPath: "mods/file-a.pak",
        targetExists: true,
      },
    ];

    const report = runSafetyDryRun(candidates);

    expect(report.plannedBackups).toEqual([{ targetPath: "mods/file-a.pak" }]);
  });

  it("blocks path traversal targets", () => {
    const candidates: DeployCandidate[] = [
      {
        modId: "mod-a",
        sourcePath: "C:/mods/mod-a/file.pak",
        relativeTargetPath: "../SnowRunner.exe",
        targetExists: false,
      },
    ];

    const report = runSafetyDryRun(candidates);

    expect(report.canProceed).toBe(false);
    expect(report.issues.some((issue) => issue.code === "path-traversal")).toBe(true);
  });

  it("blocks protected targets", () => {
    const candidates: DeployCandidate[] = [
      {
        modId: "mod-a",
        sourcePath: "C:/mods/mod-a/file.pak",
        relativeTargetPath: "SnowRunner.exe",
        targetExists: false,
      },
    ];

    const report = runSafetyDryRun(candidates);

    expect(report.canProceed).toBe(false);
    expect(report.issues.some((issue) => issue.code === "protected-target")).toBe(true);
  });

  it("blocks collisions when multiple mods target same file", () => {
    const candidates: DeployCandidate[] = [
      {
        modId: "mod-a",
        sourcePath: "C:/mods/mod-a/file.pak",
        relativeTargetPath: "mods/shared.pak",
        targetExists: false,
      },
      {
        modId: "mod-b",
        sourcePath: "C:/mods/mod-b/file.pak",
        relativeTargetPath: "mods/shared.pak",
        targetExists: false,
      },
    ];

    const report = runSafetyDryRun(candidates);

    expect(report.canProceed).toBe(false);
    expect(report.issues.some((issue) => issue.code === "target-collision")).toBe(true);
  });

  it("normalizes separators for collision detection", () => {
    const candidates: DeployCandidate[] = [
      {
        modId: "mod-a",
        sourcePath: "C:/mods/mod-a/file.pak",
        relativeTargetPath: "mods/shared.pak",
        targetExists: false,
      },
      {
        modId: "mod-b",
        sourcePath: "C:/mods/mod-b/file.pak",
        relativeTargetPath: "mods\\shared.pak",
        targetExists: false,
      },
    ];

    const report = runSafetyDryRun(candidates);

    expect(report.canProceed).toBe(false);
    expect(report.issues.some((issue) => issue.code === "target-collision")).toBe(true);
  });

  it("allows same mod to write multiple entries into the same target", () => {
    const candidates: DeployCandidate[] = [
      {
        modId: "real-life-mod",
        sourcePath: "D:/mods/real-life-mod/media",
        relativeTargetPath: "en_us/preload/paks/client/initial.pak",
        targetExists: true,
      },
      {
        modId: "real-life-mod",
        sourcePath: "D:/mods/real-life-mod/strings",
        relativeTargetPath: "en_us/preload/paks/client/initial.pak",
        targetExists: true,
      },
    ];

    const report = runSafetyDryRun(candidates);

    expect(report.canProceed).toBe(true);
    expect(report.issues.some((issue) => issue.code === "target-collision")).toBe(false);
  });
});
