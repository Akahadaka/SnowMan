import { Component } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";
import { getProfiles, updateProfile } from "./profiles.persistence";
import type { Profile } from "./profile.types";
import {
  createNamedProfile,
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
    <div class="flex flex-col h-full">

      <header class="bg-primary text-primary-content px-8 py-7">
        <h1 class="text-3xl font-bold mb-1 mt-0">Profile selection</h1>
        <p class="m-0 text-sm opacity-90">Profiles help to organise mods easily</p>
      </header>

      <div class="flex items-center gap-4 px-8 py-2 bg-base-200 border-b border-base-300">
        <button type="button" class="btn btn-ghost btn-sm" (click)="backToGameSelect()">
          ← Back to game selection
        </button>
        <span class="text-sm text-base-content/60">{{ gameLabel }} · {{ storeLabel }}</span>
      </div>

      <div class="flex flex-col gap-3 p-8 overflow-auto">
        @if (profiles.length === 0) {
          <p class="text-base-content/60 text-sm">No profiles yet. Create one below to get started.</p>
        }

        @for (profile of profiles; track profile.id) {
          <div class="card card-compact bg-base-100 border max-w-3xl"
               [class.border-primary]="profile.id === activeProfileId"
               [class.border-base-300]="profile.id !== activeProfileId">
            <div class="card-body flex-row items-center gap-3">
              @if (editingProfileId === profile.id) {
                <input
                  class="input input-bordered input-sm flex-1"
                  type="text"
                  [(ngModel)]="editingProfileName"
                  (keydown.enter)="saveEdit()"
                  (keydown.escape)="cancelEdit()"
                />
                <div class="flex gap-2">
                  <button type="button" class="btn btn-primary btn-sm" (click)="saveEdit()">Save</button>
                  <button type="button" class="btn btn-ghost btn-sm" (click)="cancelEdit()">Cancel</button>
                </div>
              } @else {
                <span class="font-semibold flex-1 text-base-content">
                  {{ profile.name }}
                  @if (profile.id === activeProfileId) {
                    <span class="badge badge-primary badge-outline badge-xs ml-2">Active</span>
                  }
                </span>
                <div class="flex gap-2">
                  <button type="button" class="btn btn-primary btn-sm" (click)="openProfile(profile.id)">Open</button>
                  <button type="button" class="btn btn-ghost btn-sm" (click)="startEdit(profile)">Rename</button>
                </div>
              }
            </div>
          </div>
        }

        <div class="join max-w-3xl mt-2">
          <input
            id="profileName"
            name="profileName"
            type="text"
            class="input input-bordered join-item flex-1"
            [(ngModel)]="newProfileName"
            placeholder="New profile name…"
          />
          <button type="button" class="btn btn-primary join-item" (click)="createProfile()">
            Create new
          </button>
        </div>
        @if (statusMessage) {
          <p class="text-sm text-base-content/60 mt-1">{{ statusMessage }}</p>
        }
      </div>

    </div>
  `,
})
export class ProfilesPageComponent {
  settings: AppSettings;
  profiles: Profile[] = [];
  activeProfileId: string | null = null;
  newProfileName = "";
  statusMessage = "";
  editingProfileId: string | null = null;
  editingProfileName = "";

  get gameLabel(): string {
    return GAME_OPTIONS.find((g) => g.id === this.settings.selectedGameId)?.label ?? this.settings.selectedGameId;
  }

  get storeLabel(): string {
    return STORE_OPTIONS.find((s) => s.id === this.settings.selectedStoreId)?.label ?? this.settings.selectedStoreId;
  }

  get activeProfileName(): string {
    return this.profiles.find((profile) => profile.id === this.activeProfileId)?.name ?? "";
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

  openProfile(profileId: string): void {
    if (!profileId) {
      this.statusMessage = "Select a profile first.";
      return;
    }

    if (profileId !== this.activeProfileId) {
      this.setActiveProfile(profileId, false);
    }

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

  startEdit(profile: Profile): void {
    this.editingProfileId = profile.id;
    this.editingProfileName = profile.name;
  }

  saveEdit(): void {
    const id = this.editingProfileId;
    const name = this.editingProfileName.trim();
    if (!id || !name) {
      this.cancelEdit();
      return;
    }
    this.settings = updateProfile(
      this.settings,
      this.settings.selectedStoreId,
      this.settings.selectedGameId,
      id,
      { name },
    );
    saveSettings(this.storage, this.settings);
    this.editingProfileId = null;
    this.editingProfileName = "";
    this.refreshProfiles();
  }

  cancelEdit(): void {
    this.editingProfileId = null;
    this.editingProfileName = "";
  }

  setActiveProfile(profileId: string, updateMessage = true): void {
    this.settings = selectActiveProfile(
      this.settings,
      this.settings.selectedStoreId,
      this.settings.selectedGameId,
      profileId,
    );
    saveSettings(this.storage, this.settings);
    if (updateMessage) {
      this.statusMessage = "Active profile updated.";
    }
    this.refreshProfiles();
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
