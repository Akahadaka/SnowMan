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
    <section class="flex flex-col items-center px-6 pt-12 min-h-full">
      <header class="text-center mb-10">
        <h1 class="text-3xl font-bold mb-2 text-base-content">Select Your Game</h1>
        <p class="text-base-content/60 m-0">Which game are you managing mods for?</p>
      </header>

      <div class="flex flex-wrap gap-5 justify-center max-w-3xl">
        @for (game of gameOptions; track game.id) {
          <button
            class="card bg-base-100 border-2 cursor-pointer w-44 h-56 transition-all hover:border-primary hover:shadow-md"
            type="button"
            [class.border-primary]="selectedGameId === game.id"
            [class.shadow-md]="selectedGameId === game.id"
            [class.border-base-300]="selectedGameId !== game.id"
            (click)="selectGame(game)"
          >
            <div class="card-body items-center justify-end">
              <span class="card-title text-base text-base-content">{{ game.label }}</span>
            </div>
          </button>
        }
      </div>
    </section>
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
