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
    <div class="mods-page">
      <header class="page-header">
        <h1>Mods</h1>
        <p>{{ activeProfileName ? 'Managing selected profile' : 'Choose a profile to continue' }}</p>
      </header>

      <div class="toolbar">
        <div class="search-box">
          <input
            type="text"
            name="searchQuery"
            [class.hidden]="activeTab !== 'online'"
            [value]="searchQuery"
            (input)="onSearchInput($any($event.target).value)"
            placeholder="Search for a mod"
          />
        </div>

        <div class="tabs">
          <button
            type="button"
            class="tab-btn"
            [class.active]="activeTab === 'installed'"
            (click)="activeTab = 'installed'"
          >
            Installed <span class="count">{{ installedMods.length }}</span>
          </button>
          <button
            type="button"
            class="tab-btn"
            [class.active]="activeTab === 'online'"
            (click)="activeTab = 'online'"
          >
            Online <span class="count">{{ approvedMods.length }}</span>
          </button>
        </div>

        @if (activeTab === 'installed' && installedMods.length > 0) {
          <button type="button" class="update-all-btn" (click)="updateAll()">
            Update all
          </button>
        }
      </div>

      @if (profiles.length === 0) {
        <p class="hint padded">Create a profile on the Profiles page first.</p>
      } @else if (activeTab === 'installed') {
        <div class="mod-list">
          @if (installedMods.length === 0) {
            <p class="hint padded">No mods installed yet. Browse Online to add some.</p>
          }
          @for (mod of installedMods; track mod.id) {
            <div class="mod-row installed-row">
              <div class="mod-info">
                <span class="mod-name">{{ mod.name }}</span>
                @if (mod.description) {
                  <span class="mod-desc">{{ mod.description }}</span>
                }
              </div>
              <div class="row-actions">
                <button type="button" class="btn-secondary" (click)="updateMod(mod)">
                  Update
                </button>
              </div>
            </div>
          }
        </div>
      } @else {
        <div class="mod-list">
          @for (approved of approvedMods; track approved.id) {
            <div class="mod-row" [class.expanded]="expandedModId === approved.id">
              <div class="mod-summary" (click)="toggleExpand(approved.id)">
                <span class="mod-name">{{ approved.name }}</span>
                <span class="expand-icon">{{ expandedModId === approved.id ? '▲' : '▼' }}</span>
              </div>

              @if (expandedModId === approved.id) {
                <div class="mod-detail">
                  <p class="mod-desc-block">{{ approved.description }}</p>
                  <p class="mod-url">{{ approved.modIoUrl }}</p>

                  @if (approved.options.length > 0) {
                    @if (modByApprovedId(activeProfileId, approved.id); as existing) {
                      <div class="options-grid">
                        @for (option of approved.options; track option.id) {
                          <label class="option-row">
                            <input
                              type="checkbox"
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

                  <div class="detail-actions">
                    <button type="button" class="btn-primary" (click)="addApprovedMod(activeProfileId, approved)">
                      {{ modByApprovedId(activeProfileId, approved.id) ? 'Re-download' : 'Download' }}
                    </button>
                  </div>
                </div>
              }
            </div>
          }
        </div>
      }

      @if (statusMessage) {
        <p class="status-bar">{{ statusMessage }}</p>
      }
    </div>
  `,
  styles: `
    .mods-page { display: flex; flex-direction: column; height: 100%; }

    .page-header {
      background: #4a90b8;
      padding: 28px 32px 24px;
      color: #fff;
    }

    .page-header h1 { margin: 0 0 4px; font-size: 1.8rem; font-weight: 700; }
    .page-header p { margin: 0; font-size: 0.95rem; opacity: 0.88; }

    .toolbar {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 20px;
      border-bottom: 1px solid rgba(16, 33, 43, 0.1);
      background: rgba(255, 255, 255, 0.6);
    }

    .search-box { flex: 1; }

    .search-box input {
      width: 100%;
      border: 1px solid rgba(16, 33, 43, 0.18);
      border-radius: 8px;
      padding: 8px 12px;
      font-size: 0.92rem;
      background: rgba(255, 255, 255, 0.9);
    }

    .search-box input.hidden { visibility: hidden; }

    .tabs { display: flex; gap: 4px; }

    .tab-btn {
      background: none;
      border: 1px solid transparent;
      border-radius: 8px;
      padding: 7px 14px;
      font-size: 0.9rem;
      font-weight: 500;
      cursor: pointer;
      color: #4e6771;
    }

    .tab-btn.active {
      border-color: #4a90b8;
      color: #4a90b8;
      background: rgba(74, 144, 184, 0.07);
    }

    .count {
      display: inline-block;
      background: rgba(16, 33, 43, 0.1);
      border-radius: 12px;
      padding: 1px 7px;
      font-size: 0.78rem;
      margin-left: 4px;
    }

    .tab-btn.active .count { background: rgba(74, 144, 184, 0.15); }

    .update-all-btn {
      background: #4a90b8;
      color: #fff;
      border: none;
      border-radius: 8px;
      padding: 8px 16px;
      font-size: 0.9rem;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
    }

    .mod-list { flex: 1; overflow-y: auto; padding: 8px 0; }
    .mod-row { border-bottom: 1px solid rgba(16, 33, 43, 0.07); }

    .installed-row {
      display: flex;
      align-items: center;
      padding: 14px 24px;
    }

    .mod-info { flex: 1; display: flex; flex-direction: column; gap: 2px; }

    .mod-summary {
      display: flex;
      align-items: center;
      padding: 14px 24px;
      cursor: pointer;
      user-select: none;
    }

    .mod-summary:hover { background: rgba(74, 144, 184, 0.04); }
    .expand-icon { margin-left: auto; color: #4e6771; font-size: 0.75rem; }
    .mod-name { font-weight: 600; font-size: 0.97rem; color: #1a2f38; }
    .mod-desc { font-size: 0.83rem; color: #4e6771; }
    .row-actions { display: flex; gap: 8px; }

    .mod-detail {
      padding: 0 24px 16px;
      border-top: 1px solid rgba(16, 33, 43, 0.06);
    }

    .mod-desc-block { font-size: 0.9rem; color: #4e6771; margin: 8px 0 4px; }
    .mod-url { font-size: 0.8rem; color: #4a90b8; word-break: break-all; margin: 0 0 10px; }

    .options-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(200px, 1fr));
      gap: 6px;
      margin: 8px 0;
    }

    .option-row {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 0.9rem;
      color: #314952;
    }

    .detail-actions { margin-top: 10px; }

    .btn-primary {
      background: #4a90b8;
      color: #fff;
      border: none;
      border-radius: 8px;
      padding: 8px 16px;
      font-size: 0.9rem;
      font-weight: 600;
      cursor: pointer;
    }

    .btn-primary:hover { background: #3a7da6; }

    .btn-secondary {
      background: rgba(255, 255, 255, 0.9);
      color: #1a2f38;
      border: 1px solid rgba(16, 33, 43, 0.2);
      border-radius: 8px;
      padding: 7px 14px;
      font-size: 0.88rem;
      cursor: pointer;
    }

    .hint { color: #4e6771; font-size: 0.95rem; }
    .padded { padding: 20px 24px; }

    .status-bar {
      padding: 10px 24px;
      background: rgba(74, 144, 184, 0.08);
      border-top: 1px solid rgba(16, 33, 43, 0.08);
      font-size: 0.88rem;
      color: #1a2f38;
      margin: 0;
    }

    @media (prefers-color-scheme: dark) {
      .toolbar {
        background: rgba(8, 19, 24, 0.5);
        border-color: rgba(239, 248, 251, 0.1);
      }

      .search-box input {
        border-color: rgba(239, 248, 251, 0.18);
        background: rgba(8, 19, 24, 0.76);
        color: #eff8fb;
      }

      .tab-btn { color: #8aacb8; }

      .tab-btn.active {
        border-color: #4a90b8;
        color: #4a90b8;
        background: rgba(74, 144, 184, 0.1);
      }

      .mod-row { border-color: rgba(239, 248, 251, 0.07); }
      .mod-detail { border-color: rgba(239, 248, 251, 0.06); }
      .mod-name { color: #d3e7ee; }
      .mod-desc, .mod-desc-block { color: #8aacb8; }
      .option-row { color: #d3e7ee; }

      .btn-secondary {
        border-color: rgba(239, 248, 251, 0.2);
        background: rgba(8, 19, 24, 0.5);
        color: #d3e7ee;
      }

      .status-bar {
        background: rgba(74, 144, 184, 0.1);
        border-color: rgba(239, 248, 251, 0.08);
        color: #d3e7ee;
      }
    }
  `,
})
export class ModsPageComponent {
  approvedMods: ReadonlyArray<ApprovedModDefinition> = [...APPROVED_MODS];
  activeTab: ModsTab = "installed";
  expandedModId: string | null = null;
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

  get activeProfileId(): string {
    return (
      this.settings.stores[this.settings.selectedStoreId]?.games[this.settings.selectedGameId]
        ?.activeProfileId ?? ""
    );
  }

  get activeProfileLabel(): string {
    const profile = this.profiles.find((p) => p.id === this.activeProfileId);
    return profile ? `Profile: ${profile.name}` : "No active profile selected";
  }

  get activeProfileName(): string {
    return this.profiles.find((p) => p.id === this.activeProfileId)?.name ?? "";
  }

  get installedMods(): ModEntry[] {
    if (!this.activeProfileId) return [];
    return Object.values(
      getModsForProfile(
        this.settings,
        this.settings.selectedStoreId,
        this.settings.selectedGameId,
        this.activeProfileId,
      ),
    );
  }

  toggleExpand(modId: string): void {
    this.expandedModId = this.expandedModId === modId ? null : modId;
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
      return { ...existing, selectedOptions: dbSelection ?? existing.selectedOptions };
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

    this.statusMessage = `Downloading ${approved.name}…`;
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
    this.statusMessage = `Updating ${modsWithApproved.length} mod(s)…`;
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
