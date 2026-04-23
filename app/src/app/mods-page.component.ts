import { Component } from "@angular/core";
import { APPROVED_MODS, getApprovedMod } from "./approved-mods.catalog";
import { toDownloadedModPath } from "./approved-mods.logic";
import { ACTIVE_GAME_ID, ACTIVE_STORE_ID } from "./game-context";
import { loadProfileSelections, saveProfileSelection, searchCatalog, syncCatalog } from "./mod-catalog.db";
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

@Component({
  selector: "app-mods-page",
  standalone: true,
  template: `
    <section class="page">
      <p class="eyebrow">Mods</p>
      <h2>Mod Manager</h2>

      <div class="search-row">
        <input
          type="text"
          name="searchQuery"
          [value]="searchQuery"
          (input)="onSearchInput($any($event.target).value)"
          placeholder="Search curated mods..."
        />
      </div>

      @if (profiles.length === 0) {
        <p class="hint">Create a profile on the Profiles page first, then import mods here.</p>
      }

      @for (profile of profiles; track profile.id) {
        <div class="profile-section">
          <h3>{{ profile.name }}</h3>

          @for (approved of approvedMods; track approved.id) {
            <div class="mod-row">
              <span class="mod-name">{{ approved.name }}</span>
              <span class="mod-path">{{ approved.modIoUrl }}</span>
              <p class="hint">{{ approved.description }}</p>

              @if (modByApprovedId(profile.id, approved.id); as existing) {
                <div class="options-grid">
                  @for (option of approved.options; track option.id) {
                    <label class="option-row">
                      <input
                        type="checkbox"
                        [checked]="isOptionSelected(existing, option)"
                        [disabled]="isOptionDisabled(option)"
                        (change)="toggleOption(profile.id, approved.id, option.id, $any($event.target).checked)"
                      />
                      <span>{{ option.label }}</span>
                    </label>
                  }
                </div>
              }

              <div class="actions-row">
                <button type="button" (click)="addApprovedMod(profile.id, approved)">
                  {{ modByApprovedId(profile.id, approved.id) ? "Re-download" : "Add to Profile" }}
                </button>
              </div>
            </div>
          }
        </div>
      }

      <p class="hint">{{ statusMessage }}</p>
    </section>
  `,
  styles: `
    .profile-section {
      margin-top: 20px;
      padding: 14px;
      border: 1px solid rgba(16, 33, 43, 0.16);
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.72);
      max-width: 760px;
    }

    .search-row {
      max-width: 760px;
      margin: 10px 0;
    }

    .search-row input {
      width: 100%;
      border: 1px solid rgba(16, 33, 43, 0.2);
      border-radius: 10px;
      padding: 10px 12px;
      font-size: 0.95rem;
      background: rgba(255, 255, 255, 0.9);
    }

    .profile-section h3 {
      margin: 0 0 10px;
      font-size: 1rem;
      color: #314952;
    }

    .mods-list {
      list-style: none;
      padding: 0;
      margin: 10px 0 0;
      display: grid;
      gap: 6px;
    }

    .mod-row {
      display: grid;
      gap: 2px;
      padding: 8px 10px;
      border: 1px solid rgba(16, 33, 43, 0.1);
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.6);
      margin-top: 8px;
    }

    .options-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(220px, 1fr));
      gap: 6px;
      margin-top: 6px;
    }

    .option-row {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      color: #314952;
    }

    .actions-row {
      margin-top: 8px;
    }

    .mod-name {
      font-weight: 600;
      color: #1a2f38;
    }

    .mod-path {
      font-size: 0.8rem;
      color: #4e6771;
      word-break: break-all;
    }

    .hint {
      color: #4e6771;
      font-size: 0.9rem;
      margin: 8px 0 0;
    }

    button {
      border: 1px solid rgba(16, 33, 43, 0.2);
      border-radius: 10px;
      padding: 8px 14px;
      font-weight: 600;
      background: #1a2f38;
      color: #eff8fb;
      cursor: pointer;
    }

    @media (prefers-color-scheme: dark) {
      .profile-section {
        border: 1px solid rgba(239, 248, 251, 0.2);
        background: rgba(8, 19, 24, 0.52);
      }

      .search-row input {
        border: 1px solid rgba(239, 248, 251, 0.2);
        background: rgba(8, 19, 24, 0.76);
        color: #eff8fb;
      }

      .profile-section h3,
      .mod-name {
        color: #d3e7ee;
      }

      .mod-path,
      .hint {
        color: #8aacb8;
      }

      .mod-row {
        border: 1px solid rgba(239, 248, 251, 0.1);
        background: rgba(8, 19, 24, 0.4);
      }

      button {
        border: 1px solid rgba(239, 248, 251, 0.2);
        background: rgba(11, 33, 44, 0.92);
        color: #eff8fb;
      }
    }
  `,
})
export class ModsPageComponent {
  approvedMods: ReadonlyArray<ApprovedModDefinition> = [...APPROVED_MODS];
  settings: AppSettings;
  profiles: Profile[] = [];
  statusMessage = "";
  searchQuery = "";
  private profileSelectionsByProfileId: Record<string, Record<string, Record<string, boolean>>> =
    {};

  private readonly storage: StorageLike;

  constructor() {
    this.storage = this.resolveStorage();
    const loaded = loadSettings(this.storage);
    this.settings = mergeSettings(
      { selectedStoreId: ACTIVE_STORE_ID, selectedGameId: ACTIVE_GAME_ID },
      loaded,
    );
    this.refreshProfiles();
    void this.initializeCatalog();
  }

  modsFor(profileId: string): ModEntry[] {
    return Object.values(
      getModsForProfile(
        this.settings,
        this.settings.selectedStoreId,
        this.settings.selectedGameId,
        profileId,
      ),
    );
  }

  modByApprovedId(profileId: string, approvedModId: string): ModEntry | undefined {
    const existing = this.modsFor(profileId).find((entry) => entry.approvedModId === approvedModId);
    const dbSelection = this.profileSelectionsByProfileId[profileId]?.[approvedModId];

    if (existing) {
      return {
        ...existing,
        selectedOptions: dbSelection ?? existing.selectedOptions,
      };
    }

    if (dbSelection) {
      return {
        id: approvedModId,
        name: approvedModId,
        sourceFolderPath: "",
        importedAt: "",
        approvedModId,
        selectedOptions: dbSelection,
      };
    }

    return undefined;
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
    const installPath =
      this.settings.stores[this.settings.selectedStoreId]?.games[this.settings.selectedGameId]
        ?.installPath ?? "";

    if (!installPath.trim()) {
      this.statusMessage = "Set install path in Settings before adding approved mods.";
      return;
    }

    const destination = toDownloadedModPath(installPath, approved.id);
    const extractedPath = await downloadAndExtractZip(approved.downloadUrl, destination);
    if (!extractedPath) {
      this.statusMessage = "Failed to download/extract approved mod package.";
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
        if (option.lockedChecked) {
          acc[option.id] = true;
        }
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

    this.statusMessage = `Added '${approved.name}' to profile and downloaded to downloaded/${approved.id}.`;
  }

  async toggleOption(
    profileId: string,
    approvedModId: string,
    optionId: string,
    checked: boolean,
  ): Promise<void> {
    const approved = getApprovedMod(approvedModId);
    const existing = this.modByApprovedId(profileId, approvedModId);
    if (!approved || !existing) {
      return;
    }

    const option = approved.options.find((entry) => entry.id === optionId);
    if (!option || option.lockedChecked) {
      return;
    }

    const updated: ModEntry = {
      ...existing,
      selectedOptions: {
        ...(existing.selectedOptions ?? {}),
        [optionId]: checked,
      },
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

  private refreshProfiles(): void {
    this.profiles = getProfiles(
      this.settings,
      this.settings.selectedStoreId,
      this.settings.selectedGameId,
    );

    void this.loadProfileSelectionsForVisibleProfiles();
  }

  async onSearchChange(): Promise<void> {
    try {
      this.approvedMods = await searchCatalog(this.searchQuery, 200);
    } catch {
      // Keep existing list when DB search is unavailable.
    }
  }

  onSearchInput(value: string): void {
    this.searchQuery = value;
    void this.onSearchChange();
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
    return {
      getItem: (k) => store.get(k) ?? null,
      setItem: (k, v) => store.set(k, v),
    };
  }
}

