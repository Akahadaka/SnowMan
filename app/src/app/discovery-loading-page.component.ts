import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { discoverGameInstallPath } from './game-discovery.service';
import {
  loadSettings,
  mergeSettings,
  saveSettings,
  setInstallPathForStore,
  type StorageLike,
} from './settings.persistence';

type DiscoveryState = 'searching' | 'found' | 'not-found';

@Component({
  selector: 'app-discovery-loading-page',
  standalone: true,
  template: `
    <section class="flex flex-col items-center px-6 pt-12 min-h-full">
      <header class="text-center mb-8">
        <h1 class="text-3xl font-bold mb-2 text-base-content">{{ headingText }}</h1>
        <p class="text-base-content/60 m-0">{{ statusText }}</p>
      </header>

      @if (state === 'searching') {
        <progress
          class="progress progress-primary w-80"
          role="progressbar"
          aria-label="Searching for game"
        ></progress>
      }

      @if (state === 'not-found') {
        <div class="card bg-base-100 border border-base-300 w-full max-w-lg mt-4">
          <div class="card-body">
            <p class="text-base-content/60 leading-relaxed">
              SnowRunner could not be located automatically. Please enter the install path manually
              in Settings.
            </p>
            <div class="card-actions justify-end mt-2">
              <button type="button" class="btn btn-ghost" (click)="back()">← Back</button>
              <button type="button" class="btn btn-primary" (click)="goToSettings()">
                Enter path manually
              </button>
            </div>
          </div>
        </div>
      }

      @if (state === 'found') {
        <div class="card bg-base-100 border border-base-300 w-full max-w-lg mt-4">
          <div class="card-body">
            <p class="font-mono text-sm text-success break-all m-0">{{ foundPath }}</p>
          </div>
        </div>
      }
    </section>
  `,
})
export class DiscoveryLoadingPageComponent implements OnInit {
  state: DiscoveryState = 'searching';
  foundPath = '';

  get headingText(): string {
    if (this.state === 'found') return 'SnowRunner Found';
    if (this.state === 'not-found') return 'Game Not Found';
    return 'Finding SnowRunner…';
  }

  get statusText(): string {
    if (this.state === 'found') return 'Install path detected. Opening your profiles…';
    if (this.state === 'not-found') return 'Automatic detection did not find an install.';
    return 'Scanning common install locations…';
  }

  private readonly storage: StorageLike;

  constructor(private readonly router: Router) {
    this.storage = this.resolveStorage();
  }

  ngOnInit(): void {
    void this.runDiscovery();
  }

  back(): void {
    void this.router.navigate(['/store-select']);
  }

  goToSettings(): void {
    void this.router.navigate(['/settings']);
  }

  private async runDiscovery(): Promise<void> {
    const settings = loadSettings(this.storage);
    const result = discoverGameInstallPath(settings.selectedGameId, settings);

    if (result.status === 'found' && result.validCandidates.length > 0) {
      const best = result.validCandidates[0];
      this.foundPath = best.path;
      this.state = 'found';

      let updated = setInstallPathForStore(
        settings,
        best.storeId,
        settings.selectedGameId,
        best.path,
      );
      updated = mergeSettings({ onboardingComplete: true }, updated);
      saveSettings(this.storage, updated);

      // Brief pause so user sees the "found" state before navigating
      await new Promise<void>((resolve) => setTimeout(resolve, 900));
      void this.router.navigate(['/profiles']);
    } else {
      this.state = 'not-found';
    }
  }

  private resolveStorage(): StorageLike {
    if (typeof localStorage !== 'undefined') return localStorage;
    const store = new Map<string, string>();
    return { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) };
  }
}
