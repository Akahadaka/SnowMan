import { Component } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";
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
    <div class="settings-page">
      <header class="page-header">
        <h1>Settings</h1>
      </header>

      <div class="context-bar">
        <span class="context-label">{{ gameLabel }} &mdash; {{ storeLabel }}</span>
        <button type="button" class="change-btn" (click)="changeGameOrStore()">
          Change game / store
        </button>
      </div>

      <form class="settings-form" (ngSubmit)="save()">
        <label for="gameInstallPath">Install Path</label>
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
          <button type="submit" class="btn-primary">Save Settings</button>
          <span class="save-status" [class.visible]="saveState === 'saved'">Saved</span>
        </div>
      </form>
    </div>
  `,
  styles: `
    .settings-page { display: flex; flex-direction: column; height: 100%; }

    .page-header {
      background: #4a90b8;
      padding: 28px 32px 24px;
      color: #fff;
    }

    .page-header h1 { margin: 0; font-size: 1.8rem; font-weight: 700; }

    .context-bar {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 12px 24px;
      background: rgba(255, 255, 255, 0.55);
      border-bottom: 1px solid rgba(16, 33, 43, 0.1);
    }

    .context-label {
      font-size: 0.95rem;
      font-weight: 600;
      color: #1a2f38;
      flex: 1;
    }

    .change-btn {
      background: none;
      border: 1px solid rgba(16, 33, 43, 0.25);
      border-radius: 8px;
      padding: 6px 14px;
      font-size: 0.88rem;
      cursor: pointer;
      color: #4a90b8;
      font-weight: 600;
    }

    .change-btn:hover { background: rgba(74, 144, 184, 0.06); }

    .settings-form {
      padding: 24px;
      display: grid;
      gap: 14px;
      max-width: 680px;
    }

    label {
      font-weight: 600;
      color: #314952;
    }

    input[type="text"] {
      border: 1px solid rgba(16, 33, 43, 0.2);
      border-radius: 10px;
      padding: 10px 12px;
      font-size: 0.95rem;
      background: rgba(255, 255, 255, 0.9);
      width: 100%;
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

    .btn-primary {
      background: #4a90b8;
      color: #fff;
      border: none;
      border-radius: 8px;
      padding: 10px 20px;
      font-size: 0.95rem;
      font-weight: 600;
      cursor: pointer;
    }

    .btn-primary:hover { background: #3a7da6; }

    .save-status {
      opacity: 0;
      color: #127255;
      font-weight: 700;
      transition: opacity 0.15s ease;
    }

    .save-status.visible { opacity: 1; }

    @media (prefers-color-scheme: dark) {
      .context-bar {
        background: rgba(8, 19, 24, 0.45);
        border-color: rgba(239, 248, 251, 0.1);
      }

      .context-label { color: #d3e7ee; }

      .change-btn {
        border-color: rgba(239, 248, 251, 0.24);
        color: #7bbfe0;
      }

      label { color: #d3e7ee; }

      input[type="text"] {
        border: 1px solid rgba(239, 248, 251, 0.2);
        background: rgba(8, 19, 24, 0.76);
        color: #eff8fb;
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

  constructor(private readonly router: Router) {
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

  get gameLabel(): string {
    return GAME_OPTIONS.find((g) => g.id === this.settings.selectedGameId)?.label ?? this.settings.selectedGameId;
  }

  get storeLabel(): string {
    return STORE_OPTIONS.find((s) => s.id === this.settings.selectedStoreId)?.label ?? this.settings.selectedStoreId;
  }

  changeGameOrStore(): void {
    void this.router.navigate(["/game-select"]);
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
