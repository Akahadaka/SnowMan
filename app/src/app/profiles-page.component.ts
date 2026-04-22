import { Component } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { getProfiles } from "./profiles.persistence";
import type { Profile } from "./profile.types";
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

      <p class="summary">Profiles in active context: {{ profiles.length }}</p>
      <p>Create, switch, and validate profiles for the active game context in this workspace.</p>
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

    .summary {
      margin-top: 10px;
      font-weight: 600;
      color: #314952;
    }

    @media (prefers-color-scheme: dark) {
      .context-panel {
        border: 1px solid rgba(239, 248, 251, 0.2);
        background: rgba(8, 19, 24, 0.52);
      }

      .context-panel h3,
      .context-panel p,
      .summary,
      label {
        color: #d3e7ee;
      }

      select {
        border: 1px solid rgba(239, 248, 251, 0.2);
        background: rgba(7, 17, 22, 0.72);
        color: #b8ced6;
      }
    }
  `,
})
export class ProfilesPageComponent {
  readonly storeOptions: ReadonlyArray<StoreOption> = STORE_OPTIONS;
  readonly gameOptions: ReadonlyArray<GameOption> = GAME_OPTIONS;

  readonly settings: AppSettings;
  readonly profiles: Profile[];

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

    this.profiles = getProfiles(
      this.settings,
      this.settings.selectedStoreId,
      this.settings.selectedGameId,
    );
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
