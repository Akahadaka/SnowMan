import type { ApprovedModDefinition } from "./mod.types";

// Curated, approved mods that SnowMan can manage directly.
export const APPROVED_MODS: ReadonlyArray<ApprovedModDefinition> = [
  {
    id: "real-life-mod",
    name: "Real Life Mod",
    modIoUrl: "https://mod.io/g/snowrunner/m/real-life-mod#description",
    downloadUrl:
      "https://g-306.modapi.io/v1/games/306/mods/182067/files/7624356/download",
    description:
      "Manual-install mod curated by SnowMan. Downloaded and extracted into downloaded/real-life-mod.",
    // Base install always overlays these entries into initial.pak.
    baseSourceRelativePaths: ["media", "strings", "initial.cache_block"],
    archiveTargetPath: "en_us/preload/paks/client/initial.pak",
    options: [
      {
        id: "no-recovery",
        label: "No Recovery (optional)",
        description: "Optional No Recovery overlay.",
        sourceRelativePath: "options/no-recovery/media",
        relativeTargetPath: "en_us/preload/paks/client/initial.pak",
      },
      {
        id: "gameplay-modes",
        label: "Real Life: Pack of Gameplay Modes (optional)",
        description: "Optional gameplay mode pack overlay.",
        sourceRelativePath: "options/gameplay-modes/media",
        relativeTargetPath: "en_us/preload/paks/client/initial.pak",
      },
    ],
  },
];

export function getApprovedMod(modId: string): ApprovedModDefinition | undefined {
  return APPROVED_MODS.find((mod) => mod.id === modId);
}
