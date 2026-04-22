import { Component, EventEmitter, Output } from "@angular/core";
import { pickDirectory } from "./dialog.bridge";
import { ACTIVE_GAME_ID, ACTIVE_STORE_ID } from "./game-context";
import { addModToProfile, getModsForProfile, importModFromFolder } from "./mod.import";
import type { ModEntry } from "./mod.types";
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

      @if (profiles.length === 0) {
        <p class="hint">Create a profile on the Profiles page first, then import mods here.</p>
      }

      @for (profile of profiles; track profile.id) {
        <div class="profile-section">
          <h3>{{ profile.name }}</h3>
          <button type="button" (click)="triggerImport(profile.id)">Import Mod</button>

          @if (modsFor(profile.id).length > 0) {
            <ul class="mods-list">
              @for (mod of modsFor(profile.id); track mod.id) {
                <li class="mod-row">
                  <span class="mod-name">{{ mod.name }}</span>
                  <span class="mod-path">{{ mod.sourceFolderPath }}</span>
                </li>
              }
            </ul>
          } @else {
            <p class="hint">No mods imported yet.</p>
          }
        </div>
      }
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
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding: 8px 10px;
      border: 1px solid rgba(16, 33, 43, 0.1);
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.6);
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
  @Output() importMod = new EventEmitter<void>();

  settings: AppSettings;
  profiles: Profile[] = [];

  private readonly storage: StorageLike;

  constructor() {
    this.storage = this.resolveStorage();
    const loaded = loadSettings(this.storage);
    this.settings = mergeSettings(
      { selectedStoreId: ACTIVE_STORE_ID, selectedGameId: ACTIVE_GAME_ID },
      loaded,
    );
    this.refreshProfiles();
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

  async triggerImport(profileId: string): Promise<void> {
    this.importMod.emit();

    const folderPath = await pickDirectory();
    if (!folderPath) return;

    const modEntry = importModFromFolder(folderPath);
    this.settings = addModToProfile(
      this.settings,
      this.settings.selectedStoreId,
      this.settings.selectedGameId,
      profileId,
      modEntry,
    );
    saveSettings(this.storage, this.settings);
  }

  private refreshProfiles(): void {
    this.profiles = getProfiles(
      this.settings,
      this.settings.selectedStoreId,
      this.settings.selectedGameId,
    );
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

