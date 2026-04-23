import { Component } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";
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
  saveSettings,
  type AppSettings,
  type StorageLike,
} from "./settings.persistence";
import { STORE_OPTIONS, GAME_OPTIONS } from "./game-context";

@Component({
  selector: "app-profiles-page",
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="profile-page">
      <header class="page-header">
        <h1>Profile selection</h1>
        <p>Profiles help to organise mods easily</p>
      </header>

      <div class="back-bar">
        <button type="button" class="back-link" (click)="backToGameSelect()">
          ← Back to game selection
        </button>
        <span class="context-tag">{{ gameLabel }} · {{ storeLabel }}</span>
      </div>

      <div class="profile-workspace">
        @if (profiles.length === 0) {
          <p class="hint">No profiles yet. Create one below to get started.</p>
        }

        @for (profile of profiles; track profile.id) {
          <div class="profile-row" [class.active-profile]="profile.id === activeProfileId">
            <span class="profile-name">{{ profile.name }}</span>
            @if (profile.id === activeProfileId) {
              <span class="active-badge">Active</span>
            }
            <div class="profile-actions">
              <button type="button" class="btn-primary" (click)="setActiveProfile(profile.id)">
                Select profile
              </button>
              <button type="button" class="btn-secondary" (click)="openMods(profile.id)">
                Mods
              </button>
            </div>
          </div>
        }

        <div class="create-section">
          <div class="create-row">
            <input
              id="profileName"
              name="profileName"
              type="text"
              [(ngModel)]="newProfileName"
              placeholder="New profile name…"
            />
            <button type="button" class="btn-primary" (click)="createProfile()">
              Create new
            </button>
          </div>
          <p class="status">{{ statusMessage }}</p>
        </div>

        <div class="launch-row">
          <button type="button" class="btn-launch-modded" (click)="launchModded()">
            ▶ Start modded
          </button>
          <button type="button" class="btn-launch-vanilla" (click)="launchVanilla()">
            ▶ Start vanilla
          </button>
        </div>
      </div>
    </div>
  `,
  styles: `
    .profile-page {
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    .page-header {
      background: #4a90b8;
      padding: 28px 32px 24px;
      color: #fff;
    }

    .page-header h1 {
      margin: 0 0 4px;
      font-size: 1.8rem;
      font-weight: 700;
    }

    .page-header p {
      margin: 0;
      font-size: 1rem;
      opacity: 0.88;
    }

    .back-bar {
      background: rgba(16, 33, 43, 0.07);
      padding: 10px 32px;
      display: flex;
      align-items: center;
      gap: 16px;
      border-bottom: 1px solid rgba(16, 33, 43, 0.1);
    }

    .back-link {
      background: none;
      border: none;
      color: #4a90b8;
      font-size: 0.92rem;
      font-weight: 600;
      cursor: pointer;
      padding: 0;
    }

    .back-link:hover { text-decoration: underline; }

    .context-tag {
      font-size: 0.85rem;
      color: #4e6771;
    }

    .profile-workspace {
      padding: 24px 32px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .hint {
      color: #4e6771;
      font-size: 0.95rem;
    }

    .profile-row {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px 16px;
      border: 1px solid rgba(16, 33, 43, 0.12);
      border-radius: 10px;
      background: rgba(255, 255, 255, 0.72);
      max-width: 780px;
    }

    .profile-row.active-profile {
      border-color: #4a90b8;
      background: rgba(74, 144, 184, 0.06);
    }

    .profile-name {
      font-weight: 600;
      font-size: 1rem;
      color: #1a2f38;
      flex: 1;
    }

    .active-badge {
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      color: #4a90b8;
      border: 1px solid #4a90b8;
      border-radius: 6px;
      padding: 2px 7px;
    }

    .profile-actions {
      display: flex;
      gap: 8px;
    }

    .btn-primary {
      background: #4a90b8;
      color: #fff;
      border: none;
      border-radius: 8px;
      padding: 8px 16px;
      font-weight: 600;
      font-size: 0.9rem;
      cursor: pointer;
    }

    .btn-primary:hover { background: #3a7da6; }

    .btn-secondary {
      background: rgba(255, 255, 255, 0.9);
      color: #1a2f38;
      border: 1px solid rgba(16, 33, 43, 0.2);
      border-radius: 8px;
      padding: 8px 16px;
      font-size: 0.9rem;
      cursor: pointer;
    }

    .create-section {
      max-width: 780px;
      margin-top: 4px;
    }

    .create-row {
      display: flex;
      gap: 10px;
    }

    input[type="text"] {
      flex: 1;
      border: 1px solid rgba(16, 33, 43, 0.2);
      border-radius: 8px;
      padding: 10px 12px;
      font-size: 0.95rem;
      background: rgba(255, 255, 255, 0.9);
    }

    .status {
      margin: 8px 0 0;
      color: #4e6771;
      font-size: 0.88rem;
      min-height: 18px;
    }

    .launch-row {
      display: flex;
      gap: 12px;
      margin-top: 8px;
    }

    .btn-launch-modded {
      background: #1a2f38;
      color: #eff8fb;
      border: none;
      border-radius: 10px;
      padding: 11px 22px;
      font-size: 0.95rem;
      font-weight: 600;
      cursor: pointer;
    }

    .btn-launch-modded:hover { background: #2a4252; }

    .btn-launch-vanilla {
      background: rgba(255, 255, 255, 0.9);
      color: #1a2f38;
      border: 1px solid rgba(16, 33, 43, 0.2);
      border-radius: 10px;
      padding: 11px 22px;
      font-size: 0.95rem;
      cursor: pointer;
    }

    @media (prefers-color-scheme: dark) {
      .back-bar {
        background: rgba(239, 248, 251, 0.04);
        border-color: rgba(239, 248, 251, 0.1);
      }

      .context-tag { color: #8aacb8; }

      .profile-row {
        border-color: rgba(239, 248, 251, 0.12);
        background: rgba(8, 19, 24, 0.52);
      }

      .profile-row.active-profile {
        border-color: #4a90b8;
        background: rgba(74, 144, 184, 0.1);
      }

      .profile-name { color: #d3e7ee; }
      .hint { color: #8aacb8; }

      .btn-secondary {
        border-color: rgba(239, 248, 251, 0.2);
        background: rgba(8, 19, 24, 0.5);
        color: #d3e7ee;
      }

      input[type="text"] {
        border-color: rgba(239, 248, 251, 0.2);
        background: rgba(8, 19, 24, 0.76);
        color: #eff8fb;
      }

      .btn-launch-vanilla {
        border-color: rgba(239, 248, 251, 0.2);
        background: rgba(8, 19, 24, 0.52);
        color: #eff8fb;
      }
    }
  `,
})
export class ProfilesPageComponent {
  settings: AppSettings;
  profiles: Profile[] = [];
  activeProfileId: string | null = null;
  newProfileName = "";
  statusMessage = "";

  get gameLabel(): string {
    return GAME_OPTIONS.find((g) => g.id === this.settings.selectedGameId)?.label ?? this.settings.selectedGameId;
  }

  get storeLabel(): string {
    return STORE_OPTIONS.find((s) => s.id === this.settings.selectedStoreId)?.label ?? this.settings.selectedStoreId;
  }

  private readonly storage: StorageLike;

  constructor(private readonly router: Router) {
    this.storage = this.resolveStorage();
    this.settings = loadSettings(this.storage);
    this.refreshProfiles();
  }

  backToGameSelect(): void {
    void this.router.navigate(["/game-select"]);
  }

  openMods(_profileId: string): void {
    void this.router.navigate(["/mods"]);
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

  async launchModded(): Promise<void> {
    await this.launchFromActiveProfile(true);
  }

  async launchVanilla(): Promise<void> {
    await this.launchFromActiveProfile(false);
  }

  private async launchFromActiveProfile(withMods: boolean): Promise<void> {
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

    if (!withMods) {
      const launched = await launchWithManagedDeploy(
        launchContext.executablePath,
        installPath,
        [],
        [],
      );
      this.statusMessage = launched ? "Game launched (vanilla)." : "Failed to launch game executable.";
      return;
    }

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
