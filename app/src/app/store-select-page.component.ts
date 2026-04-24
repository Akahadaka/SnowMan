import { Component } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";
import { STORE_OPTIONS, type StoreOption } from "./game-context";
import { STEAM_STORE_ID, type StoreId } from "./game-discovery.types";
import {
  loadSettings,
  mergeSettings,
  saveSettings,
  type StorageLike,
} from "./settings.persistence";

@Component({
  selector: "app-store-select-page",
  standalone: true,
  imports: [FormsModule],
  template: `
    <section class="onboarding">
      <header class="onboarding-header">
        <h1>Choose Your Store</h1>
        <p>Which store manages your SnowRunner installation?</p>
      </header>

      <div class="store-card">
        <fieldset class="store-options">
          <legend class="sr-only">Store</legend>
          @for (store of storeOptions; track store.id) {
            <label class="store-option" [class.selected]="selectedStoreId === store.id">
              <input
                type="radio"
                name="store"
                [value]="store.id"
                [(ngModel)]="selectedStoreId"
              />
              <span>{{ store.label }}</span>
            </label>
          }
        </fieldset>

        <div class="actions">
          <button type="button" class="back-btn" (click)="back()">← Back</button>
          <button type="button" class="continue-btn" (click)="continueToDiscovery()">
            Select platform
          </button>
        </div>
      </div>
    </section>
  `,
  styles: `
    .store-card {
      background: rgba(255, 255, 255, 0.72);
      border: 1px solid rgba(16, 33, 43, 0.14);
      border-radius: 16px;
      padding: 32px 40px;
      min-width: 360px;
      max-width: 520px;
      width: 100%;
    }

    .store-options {
      border: none;
      margin: 0 0 24px;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .store-option {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px 16px;
      border: 1px solid rgba(16, 33, 43, 0.12);
      border-radius: 10px;
      cursor: pointer;
      font-size: 1rem;
      font-weight: 500;
      color: #1a2f38;
      transition: border-color 0.14s;
    }

    .store-option.selected {
      border-color: #4a90b8;
      background: rgba(74, 144, 184, 0.07);
    }

    .store-option input[type="radio"] {
      accent-color: #4a90b8;
      width: 18px;
      height: 18px;
    }

    .actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      align-items: center;
    }

    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip: rect(0 0 0 0);
    }

    @media (prefers-color-scheme: dark) {
      .store-card {
        border-color: rgba(239, 248, 251, 0.15);
        background: rgba(8, 19, 24, 0.52);
      }

      .store-option {
        border-color: rgba(239, 248, 251, 0.12);
        color: #d3e7ee;
      }

      .store-option.selected {
        border-color: #4a90b8;
        background: rgba(74, 144, 184, 0.12);
      }
    }
  `,
})
export class StoreSelectPageComponent {
  readonly storeOptions: ReadonlyArray<StoreOption> = STORE_OPTIONS;
  selectedStoreId: StoreId = STEAM_STORE_ID;

  private readonly storage: StorageLike;

  constructor(private readonly router: Router) {
    this.storage = this.resolveStorage();
    const settings = loadSettings(this.storage);
    this.selectedStoreId = settings.selectedStoreId;
  }

  back(): void {
    void this.router.navigate(["/game-select"]);
  }

  continueToDiscovery(): void {
    const current = loadSettings(this.storage);
    const updated = mergeSettings({ selectedStoreId: this.selectedStoreId }, current);
    saveSettings(this.storage, updated);
    void this.router.navigate(["/discovery-loading"]);
  }

  private resolveStorage(): StorageLike {
    if (typeof localStorage !== "undefined") return localStorage;
    const store = new Map<string, string>();
    return { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) };
  }
}
