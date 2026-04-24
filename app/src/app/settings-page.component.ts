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
            class="input input-bordered flex-1"
            [(ngModel)]="form.gameInstallPath"
            placeholder="C:/Program Files (x86)/Steam/steamapps/common/SnowRunner"
          />
          <button type="button" class="btn btn-outline btn-neutral btn-sm" (click)="browseInstallPath()">Browse...</button>
        </div>

        <label class="checkbox-row">
          <input name="autoBackupOnDeploy" type="checkbox" class="checkbox checkbox-sm" [(ngModel)]="form.autoBackupOnDeploy" />
          <span>Auto backup before deploy</span>
        </label>

        <div class="actions">
          <button type="submit" class="btn btn-primary">Save Settings</button>
          <span class="save-status" [class.visible]="saveState === 'saved'">Saved</span>
        </div>
      </form>
    </div>
  `,
  styles: `
    .settings-page { display: flex; flex-direction: column; height: 100%; }

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

    .path-row {
      display: flex;
      gap: 10px;
      align-items: center;
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

    .save-status.visible { opacity: 1; }

    @media (prefers-color-scheme: dark) {
      label { color: #d3e7ee; }
      .save-status { color: #4cba94; }
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
