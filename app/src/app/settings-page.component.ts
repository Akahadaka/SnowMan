import { Component } from "@angular/core";
import { FormsModule } from "@angular/forms";
import {
  getInstallPathForStore,
  loadSettings,
  mergeSettings,
  saveSettings,
  type AppSettings,
  type StorageLike,
} from "./settings.persistence";
import {
  applySettingsPatch,
  createInitialSettingsForm,
  toSettingsPayload,
  type SettingsFormValues,
} from "./settings-page.logic";
import { pickDirectory } from "./dialog.bridge";
import {
  ACTIVE_GAME_ID,
  ACTIVE_STORE_ID,
  GAME_OPTIONS,
  STORE_OPTIONS,
  type GameOption,
  type StoreOption,
} from "./game-context";

@Component({
  selector: "app-settings-page",
  standalone: true,
  imports: [FormsModule],
  template: `
    <section class="page">
      <p class="eyebrow">Settings</p>
      <h2>Application Settings</h2>
      <p>Persist baseline settings now so future iterations can build on stable state.</p>

      <div class="context-panel" aria-label="Active game context">
        <h3>Active Context</h3>
        <p>Select Store then Game before editing settings.</p>
        <div class="context-grid">
          <label for="storeId">Store</label>
          <select id="storeId" name="storeId" [ngModel]="settings.selectedStoreId" disabled>
            @for (option of storeOptions; track option.id) {
              <option [value]="option.id">{{ option.label }}</option>
            }
          </select>

          <label for="gameId">Game</label>
          <select id="gameId" name="gameId" [ngModel]="settings.selectedGameId" disabled>
            @for (option of gameOptions; track option.id) {
              <option [value]="option.id">{{ option.label }}</option>
            }
          </select>
        </div>
      </div>

      <form class="settings-form" (ngSubmit)="save()">
        <label for="gameInstallPath">Install Path (Active Game)</label>
        <div class="path-row">
          <input
            id="gameInstallPath"
            name="gameInstallPath"
            type="text"
            [(ngModel)]="form.gameInstallPath"
            placeholder="C:/Program Files (x86)/Steam/steamapps/common/SnowRunner"
          />
          <button type="button" class="secondary" (click)="browseInstallPath()">Browse...</button>
        </div>

        <label class="checkbox-row">
          <input name="autoBackupOnDeploy" type="checkbox" [(ngModel)]="form.autoBackupOnDeploy" />
          <span>Auto backup before deploy</span>
        </label>

        <div class="actions">
          <button type="submit">Save Settings</button>
          <span class="save-status" [class.visible]="saveState === 'saved'">Saved</span>
        </div>
      </form>
    </section>
  `,
  styles: `
    .settings-form {
      margin-top: 16px;
      display: grid;
      gap: 12px;
      max-width: 760px;
    }

    .context-panel {
      margin-top: 14px;
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

    input[type="text"],
    select {
      border: 1px solid rgba(16, 33, 43, 0.2);
      border-radius: 10px;
      padding: 10px 12px;
      font-size: 0.95rem;
      background: rgba(255, 255, 255, 0.9);
      width: 100%;
    }

    select:disabled {
      color: #49616b;
      background: rgba(245, 248, 250, 0.95);
      cursor: not-allowed;
    }

    .path-row {
      display: flex;
      gap: 10px;
      align-items: stretch;
    }

    .secondary {
      border: 1px solid rgba(16, 33, 43, 0.3);
      border-radius: 10px;
      padding: 0 14px;
      font-size: 0.92rem;
      background: rgba(255, 255, 255, 0.9);
      color: #1a2f38;
      cursor: pointer;
      white-space: nowrap;
    }

    .checkbox-row {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      font-weight: 500;
      width: fit-content;
    }

    .actions {
      margin-top: 4px;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .save-status {
      opacity: 0;
      color: #127255;
      font-weight: 700;
      transition: opacity 0.15s ease;
    }

    .save-status.visible {
      opacity: 1;
    }

    @media (prefers-color-scheme: dark) {
      label {
        color: #d3e7ee;
      }

      .context-panel {
        border: 1px solid rgba(239, 248, 251, 0.2);
        background: rgba(8, 19, 24, 0.52);
      }

      .context-panel h3,
      .context-panel p {
        color: #d3e7ee;
      }

      input[type="text"],
      select {
        border: 1px solid rgba(239, 248, 251, 0.2);
        background: rgba(8, 19, 24, 0.76);
        color: #eff8fb;
      }

      select:disabled {
        color: #b8ced6;
        background: rgba(7, 17, 22, 0.72);
      }

      .secondary {
        border: 1px solid rgba(239, 248, 251, 0.24);
        background: rgba(8, 19, 24, 0.76);
        color: #eff8fb;
      }
    }
  `,
})
export class SettingsPageComponent {
  readonly storeOptions: ReadonlyArray<StoreOption> = STORE_OPTIONS;
  readonly gameOptions: ReadonlyArray<GameOption> = GAME_OPTIONS;

  form: SettingsFormValues;
  saveState: "idle" | "saved" = "idle";

  private readonly storage: StorageLike;
  settings: AppSettings;

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
    this.form = createInitialSettingsForm(this.settings);
  }

  save(): void {
    this.settings = toSettingsPayload(this.form, this.settings);
    saveSettings(this.storage, this.settings);

    this.form = applySettingsPatch(this.form, {
      gameInstallPath: getInstallPathForStore(
        this.settings,
        this.settings.selectedStoreId,
        this.settings.selectedGameId,
      ),
      autoBackupOnDeploy: this.settings.autoBackupOnDeploy,
    });
    this.saveState = "saved";
  }

  async browseInstallPath(): Promise<void> {
    const selectedPath = await pickDirectory();

    if (!selectedPath) {
      return;
    }

    this.form = applySettingsPatch(this.form, {
      gameInstallPath: selectedPath,
    });
    this.saveState = "idle";
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
