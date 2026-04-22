import { Component } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { loadSettings, saveSettings, type StorageLike } from "./settings.persistence";
import {
  applySettingsPatch,
  createInitialSettingsForm,
  toSettingsPayload,
  type SettingsFormValues,
} from "./settings-page.logic";

@Component({
  selector: "app-settings-page",
  standalone: true,
  imports: [FormsModule],
  template: `
    <section class="page">
      <p class="eyebrow">Settings</p>
      <h2>Application Settings</h2>
      <p>Persist baseline settings now so future iterations can build on stable state.</p>

      <form class="settings-form" (ngSubmit)="save()">
        <label for="gameInstallPath">Game Install Path</label>
        <input
          id="gameInstallPath"
          name="gameInstallPath"
          type="text"
          [(ngModel)]="form.gameInstallPath"
          placeholder="C:/Program Files (x86)/Steam/steamapps/common/SnowRunner"
        />

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

      input[type="text"] {
        border: 1px solid rgba(239, 248, 251, 0.2);
        background: rgba(8, 19, 24, 0.76);
        color: #eff8fb;
      }
    }
  `,
})
export class SettingsPageComponent {
  form: SettingsFormValues;
  saveState: "idle" | "saved" = "idle";

  private readonly storage: StorageLike;

  constructor() {
    this.storage = this.resolveStorage();
    const settings = loadSettings(this.storage);
    this.form = createInitialSettingsForm(settings);
  }

  save(): void {
    const payload = toSettingsPayload(this.form);
    saveSettings(this.storage, payload);
    this.form = applySettingsPatch(this.form, payload);
    this.saveState = "saved";
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
