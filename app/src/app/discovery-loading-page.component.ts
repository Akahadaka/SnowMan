import { Component, OnInit } from "@angular/core";
import { Router } from "@angular/router";
import { discoverGameInstallPath } from "./game-discovery.service";
import {
  loadSettings,
  mergeSettings,
  saveSettings,
  setInstallPathForStore,
  type StorageLike,
} from "./settings.persistence";

type DiscoveryState = "searching" | "found" | "not-found";

@Component({
  selector: "app-discovery-loading-page",
  standalone: true,
  template: `
    <section class="onboarding">
      <header class="onboarding-header">
        <h1>{{ headingText }}</h1>
        <p>{{ statusText }}</p>
      </header>

      @if (state === "searching") {
        <div class="progress-track" role="progressbar" aria-label="Searching for game">
          <div class="progress-bar"></div>
        </div>
      }

      @if (state === "not-found") {
        <div class="not-found-card">
          <p class="not-found-detail">
            SnowRunner could not be located automatically. Please enter the install
            path manually in Settings.
          </p>
          <div class="actions">
            <button type="button" class="back-btn" (click)="back()">← Back</button>
            <button type="button" class="manual-btn" (click)="goToSettings()">
              Enter path manually
            </button>
          </div>
        </div>
      }

      @if (state === "found") {
        <div class="found-card">
          <p class="found-path">{{ foundPath }}</p>
        </div>
      }
    </section>
  `,
  styles: `
    .progress-track {
      width: 340px;
      height: 6px;
      background: rgba(16, 33, 43, 0.1);
      border-radius: 4px;
      overflow: hidden;
    }

    .progress-bar {
      height: 100%;
      background: #4a90b8;
      border-radius: 4px;
      animation: slide 1.6s ease-in-out infinite;
      width: 40%;
    }

    @keyframes slide {
      0%   { transform: translateX(-100%); }
      100% { transform: translateX(350%); }
    }

    .not-found-card,
    .found-card {
      background: rgba(255, 255, 255, 0.72);
      border: 1px solid rgba(16, 33, 43, 0.14);
      border-radius: 16px;
      padding: 28px 32px;
      max-width: 520px;
      width: 100%;
      margin-top: 16px;
    }

    .not-found-detail {
      color: #4e6771;
      margin: 0 0 20px;
      line-height: 1.6;
    }

    .found-path {
      font-family: monospace;
      font-size: 0.92rem;
      color: #127255;
      word-break: break-all;
      margin: 0;
    }

    .actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
    }

    @media (prefers-color-scheme: dark) {
      .progress-track { background: rgba(239, 248, 251, 0.1); }

      .not-found-card,
      .found-card {
        border-color: rgba(239, 248, 251, 0.15);
        background: rgba(8, 19, 24, 0.52);
      }

      .not-found-detail { color: #8aacb8; }
      .found-path { color: #4cba94; }
    }
  `,
})
export class DiscoveryLoadingPageComponent implements OnInit {
  state: DiscoveryState = "searching";
  foundPath = "";

  get headingText(): string {
    if (this.state === "found") return "SnowRunner Found";
    if (this.state === "not-found") return "Game Not Found";
    return "Finding SnowRunner…";
  }

  get statusText(): string {
    if (this.state === "found") return "Install path detected. Opening your profiles…";
    if (this.state === "not-found") return "Automatic detection did not find an install.";
    return "Scanning common install locations…";
  }

  private readonly storage: StorageLike;

  constructor(private readonly router: Router) {
    this.storage = this.resolveStorage();
  }

  ngOnInit(): void {
    void this.runDiscovery();
  }

  back(): void {
    void this.router.navigate(["/store-select"]);
  }

  goToSettings(): void {
    void this.router.navigate(["/settings"]);
  }

  private async runDiscovery(): Promise<void> {
    const settings = loadSettings(this.storage);
    const result = discoverGameInstallPath(settings.selectedGameId, settings);

    if (result.status === "found" && result.validCandidates.length > 0) {
      const best = result.validCandidates[0];
      this.foundPath = best.path;
      this.state = "found";

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
      void this.router.navigate(["/profiles"]);
    } else {
      this.state = "not-found";
    }
  }

  private resolveStorage(): StorageLike {
    if (typeof localStorage !== "undefined") return localStorage;
    const store = new Map<string, string>();
    return { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) };
  }
}
