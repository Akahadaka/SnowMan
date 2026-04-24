import { Component } from "@angular/core";
import { APPROVED_MODS, getApprovedMod } from "./approved-mods.catalog";
import { ACTIVE_GAME_ID, ACTIVE_STORE_ID } from "./game-context";
import { toDownloadedModPath } from "./approved-mods.logic";
import {
  loadProfileSelections,
  saveProfileSelection,
  searchCatalog,
  syncCatalog,
} from "./mod-catalog.db";
import { addModToProfile, getModsForProfile, importModFromFolder } from "./mod.import";
import type { ModEntry, ApprovedModDefinition, ApprovedModOption } from "./mod.types";
import { downloadAndExtractZip } from "./mods.runtime.bridge";
import { getProfiles } from "./profiles.persistence";
import type { Profile } from "./profile.types";
import {
  loadSettings,
  mergeSettings,
  saveSettings,
  type AppSettings,
  type StorageLike,
} from "./settings.persistence";

type ModsTab = "installed" | "online";

@Component({
  selector: "app-mods-page",
  standalone: true,
  template: `
    <div class="flex flex-col h-full">

      <header class="bg-primary text-primary-content px-8 py-7">
        <h1 class="text-3xl font-bold mb-1 mt-0">Mods</h1>
        <p class="m-0 text-sm opacity-90">{{ activeProfileName ? 'Managing ' + activeProfileName : 'Choose a profile to continue' }}</p>
      </header>

      <div class="flex items-center gap-3 px-5 py-2 border-b border-base-300 bg-base-200/50">
        <div class="flex-1">
          <input
            type="text"
            name="searchQuery"
            class="input input-bordered input-sm w-full"
            [class.invisible]="activeTab !== 'online'"
            [value]="searchQuery"
            (input)="onSearchInput($any($event.target).value)"
            placeholder="Search for a mod"
          />
        </div>

        <div role="tablist" class="tabs tabs-bordered">
          <button
            role="tab"
            type="button"
            class="tab"
            [class.tab-active]="activeTab === 'installed'"
            (click)="activeTab = 'installed'"
          >
            Installed
            <span class="badge badge-sm badge-ghost ml-1">{{ installedMods.length }}</span>
          </button>
          <button
            role="tab"
            type="button"
            class="tab"
            [class.tab-active]="activeTab === 'online'"
            (click)="activeTab = 'online'"
          >
            Online
            <span class="badge badge-sm badge-ghost ml-1">{{ approvedMods.length }}</span>
          </button>
        </div>

        @if (activeTab === 'installed' && installedMods.length > 0) {
          <button type="button" class="btn btn-primary btn-sm" (click)="updateAll()">
            Update all
          </button>
        }
      </div>

      @if (profiles.length === 0) {
        <p class="text-base-content/60 text-sm px-6 py-5">Create a profile on the Profiles page first.</p>
      } @else if (activeTab === 'installed') {
        <div class="flex-1 overflow-y-auto">
          @if (installedMods.length === 0) {
            <p class="text-base-content/60 text-sm px-6 py-5">No mods installed yet. Browse Online to add some.</p>
          }
          @for (mod of installedMods; track mod.id) {
            <div class="flex items-center gap-3 px-6 py-3.5 border-b border-base-300">
              <div class="flex-1 flex flex-col gap-0.5">
                <span class="font-semibold text-base-content">{{ mod.name }}</span>
                @if (mod.description) {
                  <span class="text-xs text-base-content/60">{{ mod.description }}</span>
                }
              </div>
              <button type="button" class="btn btn-outline btn-neutral btn-sm" (click)="updateMod(mod)">
                Update
              </button>
            </div>
          }
        </div>
      } @else {
        <div class="flex-1 overflow-y-auto">
          @for (approved of approvedMods; track approved.id) {
            <div class="border-b border-base-300">
              <div class="flex items-center px-6 py-3.5 cursor-pointer select-none hover:bg-primary/5"
                   (click)="toggleExpand(approved.id)">
                <span class="font-semibold text-base-content flex-1">{{ approved.name }}</span>
                <span class="text-base-content/50 text-xs ml-auto">{{ expandedModId === approved.id ? '▲' : '▼' }}</span>
              </div>

              @if (expandedModId === approved.id) {
                <div class="px-6 pb-4 border-t border-base-300/50">
                  <p class="text-sm text-base-content/60 mt-2 mb-1">{{ approved.description }}</p>
                  <p class="text-xs text-primary break-all mb-2">{{ approved.modIoUrl }}</p>

                  @if (approved.options.length > 0) {
                    @if (modByApprovedId(activeProfileId, approved.id); as existing) {
                      <div class="grid grid-cols-2 gap-1.5 mb-3">
                        @for (option of approved.options; track option.id) {
                          <label class="flex items-center gap-2 text-sm text-base-content cursor-pointer">
                            <input
                              type="checkbox"
                              class="checkbox checkbox-xs"
                              [checked]="isOptionSelected(existing, option)"
                              [disabled]="isOptionDisabled(option)"
                              (change)="toggleOption(activeProfileId, approved.id, option.id, $any($event.target).checked)"
                            />
                            <span>{{ option.label }}</span>
                          </label>
                        }
                      </div>
                    }
                  }

                  <button type="button" class="btn btn-primary btn-sm" (click)="addApprovedMod(activeProfileId, approved)">
                    {{ modByApprovedId(activeProfileId, approved.id) ? 'Re-download' : 'Download' }}
                  </button>
                </div>
              }
            </div>
          }
        </div>
      }

      @if (statusMessage) {
        <div role="alert" class="alert alert-info rounded-none text-sm shrink-0">
          <span>{{ statusMessage }}</span>
        </div>
      }

    </div>
  `,
})
export class ModsPageComponent {
  activeTab: ModsTab = "installed";
  expandedModId: string | null = null;
  statusMessage = "";
  searchQuery = "";
  profiles: Profile[] = [];
  approvedMods: ApprovedModDefinition[] = [...APPROVED_MODS];
  profileSelectionsByProfileId: Record<string, Record<string, Record<string, boolean>>> = {};

  private settings: AppSettings;
  private readonly storage: StorageLike;

  constructor() {
    this.storage = this.resolveStorage();
    this.settings = loadSettings(this.storage);
    this.refreshProfiles();
    void this.initializeCatalog();
  }

  get activeProfileId(): string {
    return (
      this.settings.stores[this.settings.selectedStoreId]?.games[this.settings.selectedGameId]
        ?.activeProfileId ?? ""
    );
  }

  get activeProfileName(): string {
    const profile = this.profiles.find((p) => p.id === this.activeProfileId);
    return profile?.name ?? "";
  }

  get installedMods(): ModEntry[] {
    if (!this.activeProfileId) return [];
    return Object.values(getModsForProfile(
      this.settings,
      this.settings.selectedStoreId,
      this.settings.selectedGameId,
      this.activeProfileId,
    ));
  }

  modByApprovedId(profileId: string, approvedId: string): ModEntry | undefined {
    if (!profileId) return undefined;
    const mods = Object.values(getModsForProfile(
      this.settings,
      this.settings.selectedStoreId,
      this.settings.selectedGameId,
      profileId,
    ));
    return mods.find((m) => m.approvedModId === approvedId);
  }

  toggleExpand(id: string): void {
    this.expandedModId = this.expandedModId === id ? null : id;
  }

  isOptionSelected(mod: ModEntry, option: ApprovedModOption): boolean {
    if (typeof mod.selectedOptions?.[option.id] === "boolean") {
      return Boolean(mod.selectedOptions[option.id]);
    }
    return Boolean(option.lockedChecked);
  }

  isOptionDisabled(option: ApprovedModOption): boolean {
    return Boolean(option.lockedChecked);
  }

  async addApprovedMod(profileId: string, approved: ApprovedModDefinition): Promise<void> {
    if (!profileId) {
      this.statusMessage = "Select an active profile on the Profiles page first.";
      return;
    }

    const installPath =
      this.settings.stores[this.settings.selectedStoreId]?.games[this.settings.selectedGameId]
        ?.installPath ?? "";

    if (!installPath.trim()) {
      this.statusMessage = "Set install path in Settings before adding mods.";
      return;
    }

    this.statusMessage = `Downloading ${approved.name}...`;
    const destination = toDownloadedModPath(installPath, approved.id);
    const extractedPath = await downloadAndExtractZip(approved.downloadUrl, destination);
    if (!extractedPath) {
      this.statusMessage = `Failed to download/extract '${approved.name}'.`;
      return;
    }

    const current = this.modByApprovedId(profileId, approved.id);
    const modEntry = importModFromFolder(extractedPath, {
      id: approved.id,
      name: approved.name,
      description: approved.description,
    });
    modEntry.approvedModId = approved.id;
    modEntry.selectedOptions = {
      ...approved.options.reduce<Record<string, boolean>>((acc, option) => {
        if (option.lockedChecked) acc[option.id] = true;
        return acc;
      }, {}),
      ...(current?.selectedOptions ?? {}),
    };

    this.settings = addModToProfile(
      this.settings,
      this.settings.selectedStoreId,
      this.settings.selectedGameId,
      profileId,
      modEntry,
    );
    saveSettings(this.storage, this.settings);

    await saveProfileSelection(profileId, approved.id, modEntry.selectedOptions ?? {});
    if (!this.profileSelectionsByProfileId[profileId]) {
      this.profileSelectionsByProfileId[profileId] = {};
    }
    this.profileSelectionsByProfileId[profileId][approved.id] = modEntry.selectedOptions ?? {};
    this.statusMessage = `'${approved.name}' added to profile.`;
  }

  async updateMod(mod: ModEntry): Promise<void> {
    if (!mod.approvedModId) return;
    const approved = getApprovedMod(mod.approvedModId);
    if (!approved) return;
    await this.addApprovedMod(this.activeProfileId, approved);
  }

  async updateAll(): Promise<void> {
    if (!this.activeProfileId) return;
    const modsWithApproved = this.installedMods.filter((m) => m.approvedModId);
    if (modsWithApproved.length === 0) {
      this.statusMessage = "No approved mods to update.";
      return;
    }
    this.statusMessage = `Updating ${modsWithApproved.length} mod(s)...`;
    for (const mod of modsWithApproved) {
      await this.updateMod(mod);
    }
    this.statusMessage = "All mods updated.";
  }

  async toggleOption(
    profileId: string,
    approvedModId: string,
    optionId: string,
    checked: boolean,
  ): Promise<void> {
    const approved = getApprovedMod(approvedModId);
    const existing = this.modByApprovedId(profileId, approvedModId);
    if (!approved || !existing) return;

    const option = approved.options.find((entry) => entry.id === optionId);
    if (!option || option.lockedChecked) return;

    const updated: ModEntry = {
      ...existing,
      selectedOptions: { ...(existing.selectedOptions ?? {}), [optionId]: checked },
    };

    this.settings = addModToProfile(
      this.settings,
      this.settings.selectedStoreId,
      this.settings.selectedGameId,
      profileId,
      updated,
    );
    saveSettings(this.storage, this.settings);

    await saveProfileSelection(profileId, approvedModId, updated.selectedOptions ?? {});
    if (!this.profileSelectionsByProfileId[profileId]) {
      this.profileSelectionsByProfileId[profileId] = {};
    }
    this.profileSelectionsByProfileId[profileId][approvedModId] = updated.selectedOptions ?? {};
  }

  onSearchInput(value: string): void {
    this.searchQuery = value;
    void this.onSearchChange();
  }

  async onSearchChange(): Promise<void> {
    try {
      this.approvedMods = await searchCatalog(this.searchQuery, 200);
    } catch {
      // Keep existing list when DB search is unavailable.
    }
  }

  private refreshProfiles(): void {
    this.profiles = getProfiles(
      this.settings,
      this.settings.selectedStoreId,
      this.settings.selectedGameId,
    );
    void this.loadProfileSelectionsForVisibleProfiles();
  }

  private async initializeCatalog(): Promise<void> {
    try {
      await syncCatalog(APPROVED_MODS);
      this.approvedMods = await searchCatalog("", 200);
    } catch {
      this.approvedMods = [...APPROVED_MODS];
    }
  }

  private async loadProfileSelectionsForVisibleProfiles(): Promise<void> {
    const next: Record<string, Record<string, Record<string, boolean>>> = {};
    for (const profile of this.profiles) {
      try {
        next[profile.id] = await loadProfileSelections(profile.id);
      } catch {
        next[profile.id] = {};
      }
    }
    this.profileSelectionsByProfileId = next;
  }

  private resolveStorage(): StorageLike {
    if (typeof window !== "undefined" && window.localStorage) {
      return window.localStorage;
    }
    const store = new Map<string, string>();
    return { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) };
  }
}
