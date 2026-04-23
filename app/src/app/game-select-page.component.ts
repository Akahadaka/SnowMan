import { Component } from "@angular/core";
import { Router } from "@angular/router";
import { GAME_OPTIONS, type GameOption } from "./game-context";
import { SNOWRUNNER_GAME_ID } from "./game-discovery.types";
import {
  loadSettings,
  mergeSettings,
  saveSettings,
  type StorageLike,
} from "./settings.persistence";

@Component({
  selector: "app-game-select-page",
  standalone: true,
  template: `
    <section class="onboarding">
      <header class="onboarding-header">
        <h1>Select Your Game</h1>
        <p>Which game are you managing mods for?</p>
      </header>

      <div class="game-grid">
        @for (game of gameOptions; track game.id) {
          <button
            class="game-card"
            type="button"
            [class.selected]="selectedGameId === game.id"
            (click)="selectGame(game)"
          >
            <div class="game-card-inner">
              <span class="game-name">{{ game.label }}</span>
            </div>
          </button>
        }
      </div>
    </section>
  `,
  styles: `
    .onboarding {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 48px 24px;
      min-height: 100%;
    }

    .onboarding-header {
      text-align: center;
      margin-bottom: 40px;
    }

    .onboarding-header h1 {
      font-size: 2rem;
      font-weight: 700;
      margin: 0 0 8px;
      color: #1a2f38;
    }

    .onboarding-header p {
      font-size: 1.05rem;
      color: #4e6771;
      margin: 0;
    }

    .game-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 20px;
      justify-content: center;
      max-width: 900px;
    }

    .game-card {
      width: 180px;
      height: 220px;
      border: 2px solid rgba(16, 33, 43, 0.14);
      border-radius: 14px;
      background: rgba(255, 255, 255, 0.72);
      cursor: pointer;
      display: flex;
      align-items: flex-end;
      justify-content: center;
      padding: 12px;
      transition: border-color 0.15s, box-shadow 0.15s;
      text-align: center;
    }

    .game-card:hover {
      border-color: #4a90b8;
      box-shadow: 0 4px 16px rgba(74, 144, 184, 0.18);
    }

    .game-card.selected {
      border-color: #4a90b8;
      box-shadow: 0 0 0 3px rgba(74, 144, 184, 0.28);
      background: rgba(74, 144, 184, 0.06);
    }

    .game-card-inner {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
    }

    .game-name {
      font-weight: 700;
      font-size: 1.05rem;
      color: #1a2f38;
    }

    @media (prefers-color-scheme: dark) {
      .onboarding-header h1 { color: #eff8fb; }
      .onboarding-header p { color: #8aacb8; }

      .game-card {
        border-color: rgba(239, 248, 251, 0.15);
        background: rgba(8, 19, 24, 0.52);
      }

      .game-card:hover {
        border-color: #4a90b8;
      }

      .game-card.selected {
        border-color: #4a90b8;
        background: rgba(74, 144, 184, 0.1);
      }

      .game-name { color: #d3e7ee; }
    }
  `,
})
export class GameSelectPageComponent {
  readonly gameOptions: ReadonlyArray<GameOption> = GAME_OPTIONS;
  selectedGameId = SNOWRUNNER_GAME_ID;

  private readonly storage: StorageLike;

  constructor(private readonly router: Router) {
    this.storage = this.resolveStorage();
    const settings = loadSettings(this.storage);
    this.selectedGameId = settings.selectedGameId;
  }

  selectGame(game: GameOption): void {
    this.selectedGameId = game.id;
    const current = loadSettings(this.storage);
    const updated = mergeSettings({ selectedGameId: game.id }, current);
    saveSettings(this.storage, updated);
    void this.router.navigate(["/store-select"]);
  }

  private resolveStorage(): StorageLike {
    if (typeof localStorage !== "undefined") return localStorage;
    const store = new Map<string, string>();
    return { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) };
  }
}
