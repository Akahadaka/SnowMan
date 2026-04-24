import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  getInstallPathForStore,
  loadSettings,
  mergeSettings,
  saveSettings,
  type AppSettings,
  type StorageLike,
} from './settings.persistence';
import {
  applySettingsPatch,
  createInitialSettingsForm,
  toSettingsPayload,
  type SettingsFormValues,
} from './settings-page.logic';
import { pickDirectory } from './dialog.bridge';
import {
  ACTIVE_GAME_ID,
  ACTIVE_STORE_ID,
  GAME_OPTIONS,
  STORE_OPTIONS,
  type GameOption,
  type StoreOption,
} from './game-context';

@Component({
  selector: 'app-settings-page',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="flex flex-col h-full">
      <header class="bg-primary text-primary-content px-8 py-7">
        <h1 class="text-3xl font-bold m-0">Settings</h1>
      </header>

      <div class="flex items-center gap-4 px-6 py-3 bg-base-200 border-b border-base-300">
        <span class="font-semibold flex-1 text-base-content"
          >{{ gameLabel }} &mdash; {{ storeLabel }}</span
        >
        <button type="button" class="btn btn-ghost btn-sm" (click)="changeGameOrStore()">
          Change game / store
        </button>
      </div>

      <form class="grid gap-4 p-6 max-w-2xl" (ngSubmit)="save()">
        <label class="label-text font-semibold text-base-content" for="gameInstallPath"
          >Install Path</label
        >
        <div class="flex gap-2">
          <input
            id="gameInstallPath"
            name="gameInstallPath"
            type="text"
            class="input input-bordered flex-1"
            [(ngModel)]="form.gameInstallPath"
            placeholder="C:/Program Files (x86)/Steam/steamapps/common/SnowRunner"
          />
          <button
            type="button"
            class="btn btn-outline btn-neutral btn-sm"
            (click)="browseInstallPath()"
          >
            Browse…
          </button>
        </div>

        <label class="label cursor-pointer justify-start gap-3 w-fit">
          <input
            name="autoBackupOnDeploy"
            type="checkbox"
            class="checkbox checkbox-sm"
            [(ngModel)]="form.autoBackupOnDeploy"
          />
          <span class="label-text">Auto backup before deploy</span>
        </label>

        <div class="flex items-center gap-3 mt-1">
          <button type="submit" class="btn btn-primary">Save Settings</button>
          <span
            class="font-bold text-success transition-opacity duration-150"
            [class.opacity-0]="saveState !== 'saved'"
            [class.opacity-100]="saveState === 'saved'"
            >Saved ✓</span
          >
        </div>
      </form>
    </div>
  `,
  styles: ``,
})
export class SettingsPageComponent {
  readonly storeOptions: ReadonlyArray<StoreOption> = STORE_OPTIONS;
  readonly gameOptions: ReadonlyArray<GameOption> = GAME_OPTIONS;

  form: SettingsFormValues;
  saveState: 'idle' | 'saved' = 'idle';

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
    return (
      GAME_OPTIONS.find((g) => g.id === this.settings.selectedGameId)?.label ??
      this.settings.selectedGameId
    );
  }

  get storeLabel(): string {
    return (
      STORE_OPTIONS.find((s) => s.id === this.settings.selectedStoreId)?.label ??
      this.settings.selectedStoreId
    );
  }

  changeGameOrStore(): void {
    void this.router.navigate(['/game-select']);
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
    this.saveState = 'saved';
  }

  async browseInstallPath(): Promise<void> {
    const selectedPath = await pickDirectory();

    if (!selectedPath) {
      return;
    }

    this.form = applySettingsPatch(this.form, {
      gameInstallPath: selectedPath,
    });
    this.saveState = 'idle';
  }

  private resolveStorage(): StorageLike {
    if (typeof localStorage !== 'undefined') {
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
