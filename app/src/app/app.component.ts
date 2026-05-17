import { Component, DoCheck, OnInit } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { buildCandidatesForApprovedMod } from './approved-mods.logic';
import { executeControlledDeploy } from './deploy-execution';
import { GAME_OPTIONS, STORE_OPTIONS } from './game-context';
import { launchWithManagedDeploy } from './launcher.bridge';
import { getModsForProfile } from './mod.import';
import type { ModEntry } from './mod.types';
import { getAppTitle } from './ping.bridge';
import { getProfiles } from './profiles.persistence';
import type { Profile } from './profile.types';
import { deriveLaunchContext } from './profiles-page.logic';
import { shellNavigationItems } from './shell.navigation';
import {
  loadSettings,
  SETTINGS_STORAGE_KEY,
  type AppSettings,
  type StorageLike,
} from './settings.persistence';
import { resolveStartupRoute } from './startup.routing';

@Component({
  selector: 'app-root',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './app.component.html',
})
export class AppComponent implements OnInit, DoCheck {
  title = getAppTitle();
  navigationItems = shellNavigationItems;
  settings: AppSettings;
  profiles: Profile[] = [];
  shellStatusMessage = '';

  private readonly storage: StorageLike;
  private lastSettingsSnapshot: string | null = null;

  constructor(private readonly router: Router) {
    this.storage = this.resolveStorage();
    this.settings = loadSettings(this.storage);
    this.refreshProfiles();
  }

  get activeProfileId(): string {
    return (
      this.settings.stores[this.settings.selectedStoreId]?.games[this.settings.selectedGameId]
        ?.activeProfileId ?? ''
    );
  }

  get activeProfileName(): string {
    return this.profiles.find((profile) => profile.id === this.activeProfileId)?.name ?? '';
  }

  get hasActiveProfile(): boolean {
    return this.activeProfileId.length > 0;
  }

  get shellTitle(): string {
    return this.hasActiveProfile ? `${this.title}: ${this.activeProfileName}` : this.title;
  }

  get gameLabel(): string {
    return (
      GAME_OPTIONS.find((game) => game.id === this.settings.selectedGameId)?.label ??
      this.settings.selectedGameId
    );
  }

  get storeLabel(): string {
    return (
      STORE_OPTIONS.find((store) => store.id === this.settings.selectedStoreId)?.label ??
      this.settings.selectedStoreId
    );
  }

  get installedMods(): ModEntry[] {
    if (!this.activeProfileId) {
      return [];
    }

    return Object.values(
      getModsForProfile(
        this.settings,
        this.settings.selectedStoreId,
        this.settings.selectedGameId,
        this.activeProfileId,
      ),
    ).filter((mod) => mod.installState !== 'subscribed' && mod.sourceFolderPath.trim().length > 0);
  }

  get activeProfileSummary(): string {
    return `${this.gameLabel} · ${this.storeLabel} · ${this.installedMods.length} mod(s)`;
  }

  ngOnInit(): void {
    this.syncShellState(true);
    const target = resolveStartupRoute(this.settings);
    void this.router.navigate([target]);

    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', (e) => {
      document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
    });
  }

  ngDoCheck(): void {
    this.syncShellState();
  }

  async launchModded(): Promise<void> {
    await this.launchFromActiveProfile(true);
  }

  async launchVanilla(): Promise<void> {
    await this.launchFromActiveProfile(false);
  }

  private syncShellState(force = false): void {
    const serialized = this.storage.getItem(SETTINGS_STORAGE_KEY);
    if (!force && serialized === this.lastSettingsSnapshot) {
      return;
    }

    this.lastSettingsSnapshot = serialized;
    this.settings = loadSettings(this.storage);
    this.refreshProfiles();
  }

  private refreshProfiles(): void {
    this.profiles = getProfiles(
      this.settings,
      this.settings.selectedStoreId,
      this.settings.selectedGameId,
    );
  }

  private async launchFromActiveProfile(withMods: boolean): Promise<void> {
    const launchContext = deriveLaunchContext(
      this.settings,
      this.settings.selectedStoreId,
      this.settings.selectedGameId,
    );

    if (!launchContext.canLaunch || !launchContext.executablePath) {
      this.shellStatusMessage = launchContext.reason ?? 'Launch blocked by profile context.';
      return;
    }

    const installPath =
      this.settings.stores[this.settings.selectedStoreId]?.games[this.settings.selectedGameId]
        ?.installPath ?? '';

    if (!withMods) {
      const launched = await launchWithManagedDeploy(
        launchContext.executablePath,
        installPath,
        [],
        [],
      );
      this.shellStatusMessage = launched
        ? 'Game launched (vanilla).'
        : 'Failed to launch game executable.';
      return;
    }

    const candidates = this.installedMods.flatMap((mod) => buildCandidatesForApprovedMod(mod));
    const deployResult = executeControlledDeploy(candidates, new Date().toISOString());

    if (deployResult.status === 'blocked') {
      this.shellStatusMessage = 'Launch blocked: mod deploy preflight failed.';
      return;
    }

    const launched = await launchWithManagedDeploy(
      launchContext.executablePath,
      installPath,
      deployResult.plannedBackups,
      deployResult.plannedCopies,
    );
    this.shellStatusMessage = launched
      ? 'Game launched. Mods deployed; backups will be restored when the game exits.'
      : 'Failed to launch game executable.';
  }

  private resolveStorage(): StorageLike {
    if (typeof localStorage !== 'undefined') {
      return localStorage;
    }

    return {
      getItem: () => null,
      setItem: () => undefined,
    };
  }
}
