import type { ApprovedModDefinition } from "./mod.types";

// Curated, approved mods that SnowMan can manage directly.
export const APPROVED_MODS: ReadonlyArray<ApprovedModDefinition> = [
  {
    id: "real-life-mod",
    name: "Real Life Mod",
    modIoUrl: "https://mod.io/g/snowrunner/m/real-life-mod#description",
    downloadUrl: "https://g-306.modapi.io/v1/games/306/mods/182067/files/7624356/download",
    description:
      "Manual-install mod curated by SnowMan. Downloaded and extracted into downloaded/real-life-mod.",
    // Base install always overlays these entries into initial.pak.
    baseInstallSteps: [
      {
        sourceRelativePath: "media",
        relativeTargetPath: "en_us/preload/paks/client/initial.pak",
        installStrategy: "archive-overlay",
      },
      {
        sourceRelativePath: "strings",
        relativeTargetPath: "en_us/preload/paks/client/initial.pak",
        installStrategy: "archive-overlay",
      },
      {
        sourceRelativePath: "initial.cache_block",
        relativeTargetPath: "en_us/preload/paks/client/initial.pak",
        installStrategy: "archive-overlay",
      },
    ],
    options: [
      {
        id: "no-recovery",
        label: "No Recovery (optional)",
        description: "Optional No Recovery overlay.",
        sourceRelativePath: "options/no-recovery/media",
        relativeTargetPath: "en_us/preload/paks/client/initial.pak",
        installStrategy: "archive-overlay",
        includeInDeploy: true,
      },
      {
        id: "gameplay-modes",
        label: "Real Life: Pack of Gameplay Modes (optional)",
        description: "Optional gameplay mode pack overlay.",
        sourceRelativePath: "options/gameplay-modes/media",
        relativeTargetPath: "en_us/preload/paks/client/initial.pak",
        installStrategy: "archive-overlay",
        includeInDeploy: true,
      },
      {
        id: "fuel-capacities",
        label: "Fuel Capacities Based on Real Data",
        description: "Included by default in approved preset.",
        sourceRelativePath: "features/fuel-capacities",
        relativeTargetPath: "en_us/preload/paks/client/initial.pak",
        installStrategy: "archive-overlay",
        lockedChecked: true,
        includeInDeploy: false,
      },
      {
        id: "responsive-steering",
        label: "Responsive Steering",
        description: "Included by default in approved preset.",
        sourceRelativePath: "features/responsive-steering",
        relativeTargetPath: "en_us/preload/paks/client/initial.pak",
        installStrategy: "archive-overlay",
        lockedChecked: true,
        includeInDeploy: false,
      },
      {
        id: "light-up-the-night",
        label: "Light Up the Night",
        description: "Included by default in approved preset.",
        sourceRelativePath: "features/light-up-the-night",
        relativeTargetPath: "en_us/preload/paks/client/initial.pak",
        installStrategy: "archive-overlay",
        lockedChecked: true,
        includeInDeploy: false,
      },
      {
        id: "fixes-chassis-addons",
        label: "Fixes & changes for chassis & addons (partial)",
        description: "Included by default in approved preset.",
        sourceRelativePath: "features/fixes-chassis-addons",
        relativeTargetPath: "en_us/preload/paks/client/initial.pak",
        installStrategy: "archive-overlay",
        lockedChecked: true,
        includeInDeploy: false,
      },
      {
        id: "microtweaks",
        label: "MicroTweaks",
        description: "Included by default in approved preset.",
        sourceRelativePath: "features/microtweaks",
        relativeTargetPath: "en_us/preload/paks/client/initial.pak",
        installStrategy: "archive-overlay",
        lockedChecked: true,
        includeInDeploy: false,
      },
    ],
  },
];

export function getApprovedMod(modId: string): ApprovedModDefinition | undefined {
  return APPROVED_MODS.find((mod) => mod.id === modId);
}
