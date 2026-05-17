import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { STORE_OPTIONS, type StoreOption } from './game-context';
import { STEAM_STORE_ID, type StoreId } from './game-discovery.types';
import {
  loadSettings,
  mergeSettings,
  saveSettings,
  type StorageLike,
} from './settings.persistence';

@Component({
  selector: 'app-store-select-page',
  standalone: true,
  imports: [FormsModule],
  template: `
    <section class="flex flex-col items-center px-6 pt-12 min-h-full">
      <header class="text-center mb-10">
        <h1 class="text-3xl font-bold mb-2 text-base-content">Choose Your Store</h1>
        <p class="text-base-content/60 m-0">Which store manages your SnowRunner installation?</p>
      </header>

      <div class="card bg-base-100 border border-base-300 w-full max-w-lg">
        <div class="card-body">
          <fieldset class="border-none m-0 p-0 flex flex-col gap-3 mb-2">
            <legend class="sr-only">Store</legend>
            @for (store of storeOptions; track store.id) {
              <label
                class="flex items-center gap-3 p-3.5 border rounded-xl cursor-pointer font-medium text-base-content transition-colors"
                [class.border-primary]="selectedStoreId === store.id"
                [class.bg-primary]="selectedStoreId === store.id"
                [class.bg-opacity-5]="selectedStoreId === store.id"
                [class.border-base-300]="selectedStoreId !== store.id"
              >
                <input
                  type="radio"
                  class="radio radio-primary radio-sm"
                  name="store"
                  [value]="store.id"
                  [(ngModel)]="selectedStoreId"
                />
                <span>{{ store.label }}</span>
              </label>
            }
          </fieldset>

          <div class="card-actions justify-end mt-2">
            <button type="button" class="btn btn-ghost" (click)="back()">← Back</button>
            <button type="button" class="btn btn-primary" (click)="continueToDiscovery()">
              Select platform
            </button>
          </div>
        </div>
      </div>
    </section>
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
    void this.router.navigate(['/game-select']);
  }

  continueToDiscovery(): void {
    const current = loadSettings(this.storage);
    const updated = mergeSettings({ selectedStoreId: this.selectedStoreId }, current);
    saveSettings(this.storage, updated);
    void this.router.navigate(['/discovery-loading']);
  }

  private resolveStorage(): StorageLike {
    if (typeof localStorage !== 'undefined') return localStorage;
    const store = new Map<string, string>();
    return { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) };
  }
}
