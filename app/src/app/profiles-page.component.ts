import { Component } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { buildCandidatesForApprovedMod } from "./approved-mods.logic";
import { executeControlledDeploy } from "./deploy-execution";
import { launchWithManagedDeploy } from "./launcher.bridge";
import { getModsForProfile } from "./mod.import";
import { getProfiles } from "./profiles.persistence";
import type { Profile } from "./profile.types";
import {
  createNamedProfile,
  deriveLaunchContext,
  selectActiveProfile,
} from "./profiles-page.logic";
import {
  loadSettings,
  mergeSettings,
  saveSettings,
  type AppSettings,
  type StorageLike,
} from "./settings.persistence";
import {
  ACTIVE_GAME_ID,
  ACTIVE_STORE_ID,
  GAME_OPTIONS,
  STORE_OPTIONS,
  type GameOption,
  type StoreOption,
} from "./game-context";

@Component({
  selector: "app-profiles-page",
  standalone: true,
  imports: [FormsModule],
  template: `
    <section class="page">
      <p class="eyebrow">Profiles</p>
      <h2>Profile Management</h2>

      <div class="context-panel" aria-label="Active game context">
        <h3>Active Context</h3>
        <p>Select Store then Game before editing profiles.</p>
        <div class="context-grid">
          <label for="profilesStoreId">Store</label>
          <select
            id="profilesStoreId"
            name="profilesStoreId"
            [ngModel]="settings.selectedStoreId"
            disabled
          >
            @for (option of storeOptions; track option.id) {
              <option [value]="option.id">{{ option.label }}</option>
            }
          </select>

          <label for="profilesGameId">Game</label>
          <select
            id="profilesGameId"
            name="profilesGameId"
            [ngModel]="settings.selectedGameId"
            disabled
          >
            @for (option of gameOptions; track option.id) {
              <option [value]="option.id">{{ option.label }}</option>
            }
          </select>
        </div>
      </div>

      <div class="actions-panel">
        <label for="profileName">New Profile Name</label>
        <div class="create-row">
          <input
            id="profileName"
            name="profileName"
            type="text"
            [(ngModel)]="newProfileName"
            placeholder="e.g. Vanilla Safe"
          />
          <button type="button" (click)="createProfile()">Create Profile</button>
        </div>
        <p class="status">{{ statusMessage }}</p>
      </div>

      <p class="summary">Profiles in active context: {{ profiles.length }}</p>

      @if (profiles.length > 0) {
        <ul class="profiles-list">
          @for (profile of profiles; track profile.id) {
            <li>
              <label class="profile-row">
                <input
                  type="radio"
                  name="activeProfile"
                  [checked]="profile.id === activeProfileId"
                  (change)="setActiveProfile(profile.id)"
                />
                <span>{{ profile.name }}</span>
              </label>
            </li>
          }
        </ul>
      }

      <div class="launch-row">
        <button type="button" (click)="launchFromActiveProfile()">
          Launch From Active Profile
        </button>
      </div>
    </section>
  `,
  styles: `
    .context-panel {
      margin-top: 14px;
      margin-bottom: 12px;
      padding: 14px;
      border: 1px solid rgba(16, 33, 43, 0.16);
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.72);
      max-width: 760px;
    }

    .context-panel h3 {
      margin: 0 0 4px;
      font-size: 1rem;
      color: #1a2f38;
    }

    .context-panel p {
      margin: 0 0 10px;
      color: #4e6771;
      font-size: 0.9rem;
    }

    .context-grid {
      display: grid;
      grid-template-columns: 120px 1fr;
      gap: 8px 10px;
      align-items: center;
      max-width: 560px;
    }

    label {
      font-weight: 600;
      color: #314952;
    }

    select {
      border: 1px solid rgba(16, 33, 43, 0.2);
      border-radius: 10px;
      padding: 10px 12px;
      font-size: 0.95rem;
      background: rgba(255, 255, 255, 0.9);
      width: 100%;
      color: #49616b;
      cursor: not-allowed;
    }

    .actions-panel {
      margin-top: 12px;
      max-width: 760px;
      display: grid;
      gap: 8px;
    }

    .create-row {
      display: flex;
      gap: 10px;
    }

    input[type="text"] {
      border: 1px solid rgba(16, 33, 43, 0.2);
      border-radius: 10px;
      padding: 10px 12px;
      font-size: 0.95rem;
      background: rgba(255, 255, 255, 0.9);
      width: 100%;
    }

    button {
      border: 1px solid rgba(16, 33, 43, 0.2);
      border-radius: 10px;
      padding: 0 12px;
      font-weight: 600;
      background: #1a2f38;
      color: #eff8fb;
      cursor: pointer;
    }

    .summary {
      margin-top: 10px;
      font-weight: 600;
      color: #314952;
    }

    .status {
      margin: 0;
      color: #4e6771;
      font-size: 0.9rem;
      min-height: 20px;
    }

    .profiles-list {
      list-style: none;
      padding: 0;
      margin: 8px 0;
      max-width: 760px;
      display: grid;
      gap: 6px;
    }

    .profile-row {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-weight: 500;
      color: #314952;
    }

    .launch-row {
      margin-top: 10px;
    }

    @media (prefers-color-scheme: dark) {
      .context-panel {
        border: 1px solid rgba(239, 248, 251, 0.2);
        background: rgba(8, 19, 24, 0.52);
      }

      .profile-row,
      .context-panel h3,
      .context-panel p,
      .summary,
      .status,
      label {
        color: #d3e7ee;
      }

      select {
        border: 1px solid rgba(239, 248, 251, 0.2);
        background: rgba(7, 17, 22, 0.72);
        color: #b8ced6;
      }

      input[type="text"] {
        border: 1px solid rgba(239, 248, 251, 0.2);
        background: rgba(8, 19, 24, 0.76);
        color: #eff8fb;
      }

      button {
        border: 1px solid rgba(239, 248, 251, 0.2);
        background: rgba(11, 33, 44, 0.92);
        color: #eff8fb;
      }
    }
  `,
})
export class ProfilesPageComponent {
  readonly storeOptions: ReadonlyArray<StoreOption> = STORE_OPTIONS;
  readonly gameOptions: ReadonlyArray<GameOption> = GAME_OPTIONS;

  settings: AppSettings;
  profiles: Profile[] = [];
  activeProfileId: string | null = null;
  newProfileName = "";
  statusMessage = "";

  private readonly storage: StorageLike;

  constructor() {
    this.storage = this.resolveStorage();
    const loaded = loadSettings(this.storage);
    this.settings = mergeSettings(
      {
        selectedStoreId: ACTIVE_STORE_ID,
        selectedGameId: ACTIVE_GAME_ID,
      },
      loaded,
    );
    saveSettings(this.storage, this.settings);

    this.refreshProfiles();
  }

  createProfile(): void {
    const result = createNamedProfile(
      this.settings,
      this.settings.selectedStoreId,
      this.settings.selectedGameId,
      this.newProfileName,
    );

    if (!result.created || !result.profile) {
      this.statusMessage = "Enter a non-empty profile name.";
      return;
    }

    this.settings = result.settings;
    saveSettings(this.storage, this.settings);
    this.newProfileName = "";
    this.statusMessage = `Created profile '${result.profile.name}'.`;
    this.refreshProfiles();
  }

  setActiveProfile(profileId: string): void {
    this.settings = selectActiveProfile(
      this.settings,
      this.settings.selectedStoreId,
      this.settings.selectedGameId,
      profileId,
    );
    saveSettings(this.storage, this.settings);
    this.statusMessage = "Active profile updated.";
    this.refreshProfiles();
  }

  async launchFromActiveProfile(): Promise<void> {
    const launchContext = deriveLaunchContext(
      this.settings,
      this.settings.selectedStoreId,
      this.settings.selectedGameId,
    );

    if (!launchContext.canLaunch || !launchContext.executablePath) {
      this.statusMessage = launchContext.reason ?? "Launch blocked by profile context.";
      return;
    }

    const installPath =
      this.settings.stores[this.settings.selectedStoreId]?.games[this.settings.selectedGameId]
        ?.installPath ?? "";

    const profileId = launchContext.activeProfileId;
    const mods = profileId
      ? Object.values(
          getModsForProfile(
            this.settings,
            this.settings.selectedStoreId,
            this.settings.selectedGameId,
            profileId,
          ),
        )
      : [];

    const candidates = mods.flatMap((mod) => buildCandidatesForApprovedMod(mod));
    const deployResult = executeControlledDeploy(candidates, new Date().toISOString());

    if (deployResult.status === "blocked") {
      this.statusMessage = "Launch blocked: mod deploy preflight failed.";
      return;
    }

    const launched = await launchWithManagedDeploy(
      launchContext.executablePath,
      installPath,
      deployResult.plannedBackups,
      deployResult.plannedCopies,
    );
    this.statusMessage = launched
      ? "Game launched. Mods deployed; backups will be restored when the game exits."
      : "Failed to launch game executable.";
  }

  private refreshProfiles(): void {
    this.profiles = getProfiles(
      this.settings,
      this.settings.selectedStoreId,
      this.settings.selectedGameId,
    );
    this.activeProfileId =
      this.settings.stores[this.settings.selectedStoreId]?.games[this.settings.selectedGameId]
        ?.activeProfileId ?? null;
  }

  private resolveStorage(): StorageLike {
    if (typeof localStorage !== "undefined") {
      return localStorage;
    }

    let fallbackValue: string | null = null;
    return {
      getItem(): string | null {
        return fallbackValue;
      },
      setItem(_key: string, value: string): void {
        fallbackValue = value;
      },
    };
  }
}
