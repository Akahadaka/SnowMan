import { Component, ElementRef, HostListener, ViewChild } from '@angular/core';
import { APPROVED_MODS, getApprovedMod } from './approved-mods.catalog';
import { toDownloadedModPath } from './approved-mods.logic';
import { fetchAllModioCatalog, type ModioCatalogItem } from './modio-catalog.service';
import {
  loadProfileSelections,
  saveProfileSelection,
  searchCatalog,
  searchModioCatalog,
  syncModioCatalog,
  syncCatalog,
} from './mod-catalog.db';
import {
  addModToProfile,
  getModsForProfile,
  importModFromFolder,
  removeModFromProfile,
} from './mod.import';
import type { ModEntry, ApprovedModDefinition, ApprovedModOption } from './mod.types';
import { downloadAndExtractZip } from './mods.runtime.bridge';
import { getProfiles } from './profiles.persistence';
import type { Profile } from './profile.types';
import {
  loadSettings,
  saveSettings,
  type AppSettings,
  type StorageLike,
} from './settings.persistence';

type ModsTab = 'installed' | 'online' | 'subscribed';

type GlobalWithModioKey = typeof globalThis & { MODIO_API_KEY?: string };

interface OnlineCatalogItem {
  key: string;
  name: string;
  summary: string;
  profileUrl: string;
  thumbnailUrl: string;
  downloadUrl: string;
  tags: string[];
  dateUpdated: number;
  downloadsTotal: number;
  subscribersTotal: number;
  modio?: ModioCatalogItem;
  approved?: ApprovedModDefinition;
}

interface CategoryFilterOption {
  key: string;
  label: string;
  count: number;
}

const MODIO_GAME_ID = 306;
const UNCATEGORIZED_KEY = '__uncategorized';
const UNCATEGORIZED_LABEL = 'Uncategorized';

function getModioApiKey(): string {
  return (globalThis as GlobalWithModioKey).MODIO_API_KEY ?? '';
}

function normalizeCatalogUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) {
    return '';
  }

  try {
    const parsed = new URL(trimmed);
    return `${parsed.origin}${parsed.pathname}`.replace(/\/+$/, '').toLowerCase();
  } catch {
    return trimmed.split('#')[0].split('?')[0].replace(/\/+$/, '').toLowerCase();
  }
}

@Component({
  selector: 'app-mods-page',
  standalone: true,
  template: `
    <div class="flex flex-col h-full">
      <header class="bg-primary text-primary-content px-8 py-7">
        <h1 class="text-3xl font-bold mb-1 mt-0">Mods</h1>
        <p class="m-0 text-sm opacity-90">
          {{ activeProfileName ? 'Managing ' + activeProfileName : 'Choose a profile to continue' }}
        </p>
      </header>

      <div class="flex items-center gap-3 px-5 py-2 border-b border-base-300 bg-base-200/50">
        <div class="flex-1">
          <input
            type="text"
            name="searchQuery"
            class="input input-bordered input-sm w-full"
            [class.invisible]="activeTab !== 'online'"
            [value]="searchQuery"
            (input)="onSearchInput($any($event.target).value)"
            placeholder="Search for a mod"
          />
        </div>

        <details #categoryDropdown class="dropdown dropdown-end">
          <summary class="btn btn-outline btn-sm">
            Categories
            @if (selectedCategoryFilters.length > 0) {
              <span class="badge badge-sm ml-1">{{ selectedCategoryFilters.length }}</span>
            }
          </summary>
          <div class="dropdown-content z-20 mt-2 w-72 rounded-box border border-base-300 bg-base-100 p-3 shadow-lg">
            @if (availableCategoryFilters.length === 0) {
              <p class="m-0 text-xs text-base-content/60">No categories on this tab yet.</p>
            } @else {
              <div class="max-h-60 overflow-y-auto pr-1">
                @for (option of availableCategoryFilters; track option.key) {
                  <label class="flex items-center justify-between gap-2 py-1 text-sm cursor-pointer">
                    <span class="flex items-center gap-2">
                      <input
                        type="checkbox"
                        class="checkbox checkbox-xs"
                        [checked]="isCategoryFilterSelected(option.key)"
                        (change)="toggleCategoryFilter(option.key, $any($event.target).checked)"
                      />
                      <span>{{ option.label }}</span>
                    </span>
                    <span class="text-xs text-base-content/50">{{ option.count }}</span>
                  </label>
                }
              </div>
            }

            <div class="mt-3 border-t border-base-300 pt-2">
              <button
                type="button"
                class="btn btn-ghost btn-xs"
                [disabled]="selectedCategoryFilters.length === 0"
                (click)="clearCategoryFilters()"
              >
                Clear filters
              </button>
            </div>
          </div>
        </details>

        <button
          type="button"
          class="btn btn-ghost btn-sm"
          aria-label="Clear categories"
          title="Clear categories"
          [disabled]="selectedCategoryFilters.length === 0"
          (click)="clearCategoryFilters()"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            class="h-4 w-4"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>

        <div role="tablist" class="tabs tabs-bordered">
          <button
            role="tab"
            type="button"
            class="tab"
            [class.tab-active]="activeTab === 'installed'"
            (click)="activeTab = 'installed'"
          >
            Installed
            <span class="badge badge-sm badge-ghost ml-1">{{ installedTabCount }}</span>
          </button>
          <button
            role="tab"
            type="button"
            class="tab"
            [class.tab-active]="activeTab === 'subscribed'"
            (click)="setActiveTab('subscribed')"
          >
            Subscribed
            <span class="badge badge-sm badge-ghost ml-1">{{ subscribedTabCount }}</span>
          </button>
          <button
            role="tab"
            type="button"
            class="tab"
            [class.tab-active]="activeTab === 'online'"
            (click)="setActiveTab('online')"
          >
            Online
            <span class="badge badge-sm badge-ghost ml-1">{{ onlineTabCount }}</span>
          </button>
        </div>

        @if (activeTab === 'installed' && installedMods.length > 0) {
          <button type="button" class="btn btn-primary btn-sm" (click)="updateAll()">
            Update all
          </button>
        }
      </div>

      @if (profiles.length === 0) {
        <p class="text-base-content/60 text-sm px-6 py-5">
          Create a profile on the Profiles page first.
        </p>
      } @else if (activeTab === 'installed') {
        <div class="flex-1 overflow-y-auto">
          @if (installedMods.length === 0) {
            <p class="text-base-content/60 text-sm px-6 py-5">
              No mods installed yet. Browse Online to add some.
            </p>
          } @else if (filteredInstalledMods.length === 0) {
            <p class="text-base-content/60 text-sm px-6 py-5">
              No installed mods match the selected categories.
            </p>
          }
          @for (mod of filteredInstalledMods; track mod.id) {
            <div class="flex items-center gap-3 px-6 py-3.5 border-b border-base-300">
              <div class="flex-1 flex flex-col gap-0.5">
                <span class="font-semibold text-base-content">{{ mod.name }}</span>
                @if (mod.description) {
                  <span class="text-xs text-base-content/60">{{ mod.description }}</span>
                }
                @if (categoryPillsForMod(mod).length > 0) {
                  <div class="mt-2 flex flex-wrap gap-1">
                    @for (pill of categoryPillsForMod(mod); track pill.key) {
                      <span
                        class="badge badge-sm px-2 py-2 cursor-pointer"
                        [class.badge-primary]="
                          selectedCategoryFilters.length > 0 && isCategoryFilterSelected(pill.key)
                        "
                        [class.badge-outline]="
                          selectedCategoryFilters.length === 0 || !isCategoryFilterSelected(pill.key)
                        "
                        (click)="toggleCategoryFilter(pill.key, !isCategoryFilterSelected(pill.key))"
                      >
                        {{ pill.label }}
                      </span>
                    }
                  </div>
                }
              </div>
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  class="btn btn-outline btn-neutral btn-sm"
                  [class.loading]="isStoredModBusy(mod, 'update')"
                  [disabled]="!isUpdateAvailable(mod) || isStoredModBusy(mod)"
                  (click)="updateMod(mod)"
                >
                  {{ isStoredModBusy(mod, 'update') ? 'Updating...' : 'Update' }}
                </button>
                <button
                  type="button"
                  class="btn btn-outline btn-error btn-sm"
                  [disabled]="isStoredModBusy(mod)"
                  (click)="removeInstalledMod(mod)"
                >
                  {{ mod.modioModId || mod.approvedModId ? 'Unsubscribe' : 'Remove' }}
                </button>
              </div>
            </div>
          }
        </div>
      } @else if (activeTab === 'subscribed') {
        <div class="flex-1 overflow-y-auto">
          @if (subscribedCatalogItems.length === 0) {
            <p class="text-base-content/60 text-sm px-6 py-5">
              No subscribed mods yet. Browse Online to subscribe.
            </p>
          } @else if (filteredSubscribedCatalogItems.length === 0) {
            <p class="text-base-content/60 text-sm px-6 py-5">
              No subscribed mods match the selected categories.
            </p>
          }
          <div class="grid gap-2 px-6 py-4">
            @for (item of filteredSubscribedCatalogItems; track item.key) {
              <div class="border border-base-300 rounded-box p-3">
                <div class="flex items-start gap-3">
                  <div
                    class="w-28 h-16 shrink-0 rounded-md overflow-hidden border border-base-300 bg-base-200"
                  >
                    @if (item.thumbnailUrl) {
                      <img
                        [src]="item.thumbnailUrl"
                        [alt]="item.name"
                        class="w-full h-full object-cover"
                      />
                    } @else {
                      <div
                        class="w-full h-full flex items-center justify-center text-[11px] text-base-content/50"
                      >
                        No image
                      </div>
                    }
                  </div>

                  <div class="min-w-0 flex-1">
                    <div class="flex items-start justify-between gap-3">
                      <div class="min-w-0">
                        <p class="font-semibold m-0">{{ item.name }}</p>
                        <p class="text-xs text-base-content/60 m-0 mt-0.5 line-clamp-2">
                          {{ item.summary || 'No summary provided.' }}
                        </p>
                      </div>
                      <div class="flex items-center gap-2">
                        <button
                          type="button"
                          class="btn btn-primary btn-xs"
                          [class.loading]="isOnlineItemBusy(item, 'install')"
                          [disabled]="isOnlineItemBusy(item)"
                          (click)="installSubscribedItem(item)"
                        >
                          {{
                            isOnlineItemBusy(item, 'install')
                              ? 'Downloading...'
                              : isCatalogItemInstalled(item)
                                ? 'Reinstall'
                                : 'Install'
                          }}
                        </button>
                        <button
                          type="button"
                          class="btn btn-outline btn-error btn-xs"
                          [disabled]="isOnlineItemBusy(item)"
                          (click)="toggleModioSubscription(item)"
                        >
                          Unsubscribe
                        </button>
                      </div>
                    </div>

                    @if (isOnlineItemBusy(item, 'install')) {
                      <p class="text-xs text-info m-0 mt-2">Downloading and extracting...</p>
                    }

                    @if (categoryPillsForItem(item).length > 0) {
                      <div class="mt-2 flex flex-wrap gap-1">
                        @for (pill of categoryPillsForItem(item); track pill.key) {
                          <span
                            class="badge badge-sm px-2 py-2 cursor-pointer"
                            [class.badge-primary]="
                              selectedCategoryFilters.length > 0 && isCategoryFilterSelected(pill.key)
                            "
                            [class.badge-outline]="
                              selectedCategoryFilters.length === 0 ||
                              !isCategoryFilterSelected(pill.key)
                            "
                            (click)="toggleCategoryFilter(pill.key, !isCategoryFilterSelected(pill.key))"
                          >
                            {{ pill.label }}
                          </span>
                        }
                      </div>
                    }
                  </div>
                </div>
              </div>
            }
          </div>
        </div>
      } @else {
        <div class="flex-1 overflow-y-auto">
          <div class="px-6 pt-4 pb-2">
            <h3 class="text-sm font-semibold text-base-content/80 m-0 mb-2">mod.io catalog</h3>

            @if (modioLoading) {
              <p class="text-xs text-base-content/60 m-0">Loading mod.io results…</p>
            } @else if (modioError) {
              <p class="text-xs text-warning m-0">{{ modioError }}</p>
            } @else if (onlineCatalogItems.length === 0) {
              <p class="text-xs text-base-content/60 m-0">No catalog results for this query.</p>
            } @else if (filteredOnlineCatalogItems.length === 0) {
              <p class="text-xs text-base-content/60 m-0">
                No catalog results match the selected categories.
              </p>
            } @else {
              <div class="grid gap-2">
                @for (item of filteredOnlineCatalogItems; track item.key) {
                  <div
                    class="border border-base-300 rounded-box p-3 cursor-pointer hover:bg-primary/5"
                    (click)="toggleOnlineExpand(item.key)"
                  >
                    <div class="flex items-start gap-3">
                      <div
                        class="w-28 h-16 shrink-0 rounded-md overflow-hidden border border-base-300 bg-base-200"
                      >
                        @if (item.thumbnailUrl) {
                          <img
                            [src]="item.thumbnailUrl"
                            [alt]="item.name"
                            class="w-full h-full object-cover"
                          />
                        } @else {
                          <div
                            class="w-full h-full flex items-center justify-center text-[11px] text-base-content/50"
                          >
                            No image
                          </div>
                        }
                      </div>

                      <div class="min-w-0 flex-1">
                        <div class="flex items-start justify-between gap-3">
                          <div class="min-w-0">
                            <p class="font-semibold m-0">{{ item.name }}</p>
                            <p class="text-xs text-base-content/60 m-0 mt-0.5 line-clamp-2">
                              {{ item.summary || 'No summary provided.' }}
                            </p>
                          </div>
                          <button
                            type="button"
                            class="btn btn-xs"
                            [class.btn-primary]="!isModioSubscribed(item)"
                            [class.btn-outline]="isModioSubscribed(item)"
                            [class.loading]="isOnlineItemBusy(item, 'subscribe')"
                            [disabled]="isOnlineItemBusy(item)"
                            (click)="$event.stopPropagation(); toggleModioSubscription(item)"
                          >
                            {{
                              isOnlineItemBusy(item, 'subscribe')
                                ? 'Subscribing...'
                                : isModioSubscribed(item)
                                  ? 'Unsubscribe'
                                  : 'Subscribe'
                            }}
                          </button>
                        </div>

                        @if (categoryPillsForItem(item).length > 0) {
                          <div class="mt-2 flex flex-wrap gap-1">
                            @for (pill of categoryPillsForItem(item); track pill.key) {
                              <span
                                class="badge badge-sm px-2 py-2 cursor-pointer"
                                [class.badge-primary]="
                                  selectedCategoryFilters.length > 0 &&
                                  isCategoryFilterSelected(pill.key)
                                "
                                [class.badge-outline]="
                                  selectedCategoryFilters.length === 0 ||
                                  !isCategoryFilterSelected(pill.key)
                                "
                                (click)="toggleCategoryFilter(pill.key, !isCategoryFilterSelected(pill.key))"
                              >
                                {{ pill.label }}
                              </span>
                            }
                          </div>
                        }

                        <p class="text-[11px] text-base-content/40 m-0 mt-1">
                          Downloads: {{ item.downloadsTotal }}
                          @if (item.subscribersTotal > 0) {
                            <span> • Subscribers: {{ item.subscribersTotal }}</span>
                          }
                        </p>

                        <p class="text-[11px] text-base-content/40 m-0 mt-1">
                          {{
                            expandedOnlineKey === item.key
                              ? 'Click to collapse'
                              : 'Click for details'
                          }}
                        </p>
                      </div>
                    </div>

                    @if (expandedOnlineKey === item.key) {
                      <div
                        class="mt-3 pt-3 border-t border-base-300/70 text-xs text-base-content/70"
                      >
                        <p class="m-0 mb-2">
                          {{ item.summary || 'No additional description available.' }}
                        </p>
                        @if (item.dateUpdated > 0) {
                          <p class="m-0">Updated (epoch): {{ item.dateUpdated }}</p>
                        }
                        <p class="m-0 mt-1 break-all">Profile: {{ item.profileUrl || 'N/A' }}</p>
                        @if (item.downloadUrl) {
                          <p class="m-0 mt-1 break-all">Download: {{ item.downloadUrl }}</p>
                        } @else {
                          <p class="m-0 mt-1 text-warning">
                            No downloadable file currently available.
                          </p>
                        }

                        @if (item.approved) {
                          <div class="mt-3 p-3 rounded-box bg-base-200/70">
                            <p class="m-0 font-semibold text-base-content">
                              SnowMan managed install
                            </p>
                            <p class="m-0 mt-1">{{ item.approved.description }}</p>
                            @if (item.approved.options.length > 0) {
                              @if (approvedEntryForItem(item); as existing) {
                                <div class="grid grid-cols-2 gap-1.5 mt-3">
                                  @for (option of item.approved.options; track option.id) {
                                    <label
                                      class="flex items-center gap-2 text-sm text-base-content cursor-pointer"
                                    >
                                      <input
                                        type="checkbox"
                                        class="checkbox checkbox-xs"
                                        [checked]="isOptionSelected(existing, option)"
                                        [disabled]="isOptionDisabled(option)"
                                        (click)="$event.stopPropagation()"
                                        (change)="
                                          toggleOption(
                                            activeProfileId,
                                            item.approved.id,
                                            option.id,
                                            $any($event.target).checked
                                          )
                                        "
                                      />
                                      <span>{{ option.label }}</span>
                                    </label>
                                  }
                                </div>
                              } @else {
                                <div class="mt-2">
                                  @for (option of item.approved.options; track option.id) {
                                    <p class="m-0 mt-1">
                                      {{ option.label }}
                                      @if (option.lockedChecked) {
                                        <span class="text-base-content/50"> • included</span>
                                      }
                                    </p>
                                  }
                                </div>
                              }
                            }
                          </div>
                        }
                      </div>
                    }
                  </div>
                }
              </div>
            }
          </div>
        </div>
      }

      @if (statusMessage) {
        <div role="alert" class="alert alert-info rounded-none text-sm shrink-0">
          <span>{{ statusMessage }}</span>
        </div>
      }
    </div>
  `,
})
export class ModsPageComponent {
  @ViewChild('categoryDropdown')
  private categoryDropdownRef?: ElementRef<HTMLDetailsElement>;

  activeTab: ModsTab = 'installed';
  expandedOnlineKey: string | null = null;
  busyItemKey: string | null = null;
  busyItemAction: 'subscribe' | 'install' | 'update' | null = null;
  statusMessage = '';
  searchQuery = '';
  modioMods: ModioCatalogItem[] = [];
  modioLoading = false;
  modioError = '';
  hasHydratedModioCache = false;
  profiles: Profile[] = [];
  approvedMods: ApprovedModDefinition[] = [...APPROVED_MODS];
  profileSelectionsByProfileId: Record<string, Record<string, Record<string, boolean>>> = {};
  selectedCategoryFilters: string[] = [];

  private settings: AppSettings;
  private readonly storage: StorageLike;

  constructor() {
    this.storage = this.resolveStorage();
    this.settings = loadSettings(this.storage);
    this.refreshProfiles();
    void this.initializeCatalog();
    if (getModioApiKey().trim()) {
      void this.loadModioCatalog();
    }
  }

  get activeProfileId(): string {
    return (
      this.settings.stores[this.settings.selectedStoreId]?.games[this.settings.selectedGameId]
        ?.activeProfileId ?? ''
    );
  }

  get activeProfileName(): string {
    const profile = this.profiles.find((p) => p.id === this.activeProfileId);
    return profile?.name ?? '';
  }

  get installedMods(): ModEntry[] {
    if (!this.activeProfileId) return [];
    return Object.values(
      getModsForProfile(
        this.settings,
        this.settings.selectedStoreId,
        this.settings.selectedGameId,
        this.activeProfileId,
      ),
    ).filter((mod) => this.isInstalledModEntry(mod));
  }

  get subscribedMods(): ModEntry[] {
    if (!this.activeProfileId) return [];
    return Object.values(
      getModsForProfile(
        this.settings,
        this.settings.selectedStoreId,
        this.settings.selectedGameId,
        this.activeProfileId,
      ),
    ).filter((mod) => this.isSubscriptionTrackedMod(mod));
  }

  get subscribedCatalogItems(): OnlineCatalogItem[] {
    return this.subscribedMods.map((mod) => this.catalogItemForMod(mod));
  }

  get installedTabCount(): number {
    return this.activeTab === 'installed' ? this.filteredInstalledMods.length : this.installedMods.length;
  }

  get subscribedTabCount(): number {
    return this.activeTab === 'subscribed'
      ? this.filteredSubscribedCatalogItems.length
      : this.subscribedMods.length;
  }

  get onlineTabCount(): number {
    return this.activeTab === 'online'
      ? this.filteredOnlineCatalogItems.length
      : this.onlineCatalogItems.length;
  }

  get filteredInstalledMods(): ModEntry[] {
    return this.installedMods.filter((mod) => this.matchesCategoryFilters(this.categoryKeysForMod(mod)));
  }

  get filteredSubscribedCatalogItems(): OnlineCatalogItem[] {
    return this.subscribedCatalogItems.filter((item) => this.matchesCategoryFilters(this.categoryKeysForItem(item)));
  }

  get onlineCatalogItems(): OnlineCatalogItem[] {
    const merged = new Map<string, OnlineCatalogItem>();

    for (const modio of this.modioMods) {
      const normalizedUrl = normalizeCatalogUrl(modio.profileUrl);
      const key = normalizedUrl ? `catalog:${normalizedUrl}` : `modio:${modio.id}`;
      merged.set(key, {
        key,
        name: modio.name,
        summary: modio.summary,
        profileUrl: modio.profileUrl,
        thumbnailUrl: modio.thumbnailUrl,
        downloadUrl: modio.downloadUrl,
        tags: modio.tags,
        dateUpdated: modio.dateUpdated,
        downloadsTotal: modio.downloadsTotal,
        subscribersTotal: modio.subscribersTotal,
        modio,
      });
    }

    for (const approved of this.approvedMods) {
      const normalizedUrl = normalizeCatalogUrl(approved.modIoUrl);
      const key = normalizedUrl ? `catalog:${normalizedUrl}` : `approved:${approved.id}`;
      const existing = merged.get(key);

      if (existing) {
        merged.set(key, {
          ...existing,
          approved,
          profileUrl: existing.profileUrl || approved.modIoUrl,
          downloadUrl: existing.downloadUrl || approved.downloadUrl,
        });
        continue;
      }

      merged.set(key, {
        key,
        name: approved.name,
        summary: approved.description,
        profileUrl: approved.modIoUrl,
        thumbnailUrl: '',
        downloadUrl: approved.downloadUrl,
        tags: [],
        dateUpdated: 0,
        downloadsTotal: 0,
        subscribersTotal: 0,
        approved,
      });
    }

    return Array.from(merged.values());
  }

  get filteredOnlineCatalogItems(): OnlineCatalogItem[] {
    return this.onlineCatalogItems.filter((item) => this.matchesCategoryFilters(this.categoryKeysForItem(item)));
  }

  get availableCategoryFilters(): CategoryFilterOption[] {
    const counts = new Map<string, number>();
    const labels = new Map<string, string>();

    for (const keys of this.currentTabCategoryKeys()) {
      for (const key of keys) {
        counts.set(key, (counts.get(key) ?? 0) + 1);
        if (!labels.has(key)) {
          labels.set(key, key === UNCATEGORIZED_KEY ? UNCATEGORIZED_LABEL : key);
        }
      }
    }

    return Array.from(counts.entries())
      .map(([key, count]) => ({
        key,
        label: labels.get(key) ?? key,
        count,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }

  modByApprovedId(profileId: string, approvedId: string): ModEntry | undefined {
    if (!profileId) return undefined;
    const mods = Object.values(
      getModsForProfile(
        this.settings,
        this.settings.selectedStoreId,
        this.settings.selectedGameId,
        profileId,
      ),
    );
    return mods.find((m) => m.approvedModId === approvedId);
  }

  private modByModId(profileId: string, modId: string): ModEntry | undefined {
    if (!profileId) return undefined;
    return getModsForProfile(
      this.settings,
      this.settings.selectedStoreId,
      this.settings.selectedGameId,
      profileId,
    )[modId];
  }

  toggleOnlineExpand(key: string): void {
    this.expandedOnlineKey = this.expandedOnlineKey === key ? null : key;
  }

  setActiveTab(tab: ModsTab): void {
    this.activeTab = tab;
    this.clearCategoryFilters();
    if (this.modioMods.length === 0 && !this.modioLoading) {
      void this.loadModioCatalog();
    }
  }

  isCategoryFilterSelected(key: string): boolean {
    return this.selectedCategoryFilters.includes(key);
  }

  toggleCategoryFilter(key: string, checked: boolean): void {
    if (checked) {
      if (!this.selectedCategoryFilters.includes(key)) {
        this.selectedCategoryFilters = [...this.selectedCategoryFilters, key];
      }
      return;
    }

    this.selectedCategoryFilters = this.selectedCategoryFilters.filter((selected) => selected !== key);
  }

  clearCategoryFilters(): void {
    this.selectedCategoryFilters = [];
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const dropdownElement = this.categoryDropdownRef?.nativeElement;
    if (!dropdownElement?.open) {
      return;
    }

    const target = event.target;
    if (!(target instanceof Node)) {
      return;
    }

    if (!dropdownElement.contains(target)) {
      dropdownElement.open = false;
    }
  }

  private isInstalledModEntry(mod: ModEntry): boolean {
    if (mod.installState) {
      return mod.installState === 'installed';
    }

    return mod.sourceFolderPath.trim().length > 0;
  }

  private isSubscribedModEntry(mod: ModEntry): boolean {
    return !this.isInstalledModEntry(mod);
  }

  private isSubscriptionTrackedMod(mod: ModEntry): boolean {
    return Boolean(mod.approvedModId || mod.modioModId);
  }

  private normalizeCategory(tag: string): string {
    const trimmed = tag.trim();
    return trimmed ? trimmed.toLowerCase() : '';
  }

  private categoryKeysForItem(item: OnlineCatalogItem): string[] {
    const unique = new Set<string>();
    for (const tag of item.tags) {
      const normalized = this.normalizeCategory(tag);
      if (normalized) {
        unique.add(normalized);
      }
    }

    if (unique.size === 0) {
      return [UNCATEGORIZED_KEY];
    }

    return Array.from(unique.values());
  }

  private categoryKeysForMod(mod: ModEntry): string[] {
    return this.categoryKeysForItem(this.catalogItemForMod(mod));
  }

  categoryLabelsForItem(item: OnlineCatalogItem): string[] {
    return this.categoryKeysForItem(item).map((key) =>
      key === UNCATEGORIZED_KEY ? UNCATEGORIZED_LABEL : this.toCategoryLabel(key),
    );
  }

  categoryLabelsForMod(mod: ModEntry): string[] {
    return this.categoryLabelsForItem(this.catalogItemForMod(mod));
  }

  categoryPillsForItem(item: OnlineCatalogItem): Array<{ key: string; label: string }> {
    return this.categoryKeysForItem(item).map((key) => ({
      key,
      label: key === UNCATEGORIZED_KEY ? UNCATEGORIZED_LABEL : this.toCategoryLabel(key),
    }));
  }

  categoryPillsForMod(mod: ModEntry): Array<{ key: string; label: string }> {
    return this.categoryPillsForItem(this.catalogItemForMod(mod));
  }

  private toCategoryLabel(key: string): string {
    return key
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  private matchesCategoryFilters(keys: string[]): boolean {
    if (this.selectedCategoryFilters.length === 0) {
      return true;
    }

    return keys.some((key) => this.selectedCategoryFilters.includes(key));
  }

  private currentTabCategoryKeys(): string[][] {
    if (this.activeTab === 'online') {
      return this.onlineCatalogItems.map((item) => this.categoryKeysForItem(item));
    }

    if (this.activeTab === 'subscribed') {
      return this.subscribedCatalogItems.map((item) => this.categoryKeysForItem(item));
    }

    return this.installedMods.map((mod) => this.categoryKeysForMod(mod));
  }

  isOptionSelected(mod: ModEntry, option: ApprovedModOption): boolean {
    if (typeof mod.selectedOptions?.[option.id] === 'boolean') {
      return Boolean(mod.selectedOptions[option.id]);
    }
    return Boolean(option.lockedChecked);
  }

  isOptionDisabled(option: ApprovedModOption): boolean {
    return Boolean(option.lockedChecked);
  }

  async addApprovedMod(profileId: string, approved: ApprovedModDefinition): Promise<void> {
    if (!profileId) {
      this.statusMessage = 'Select an active profile on the Profiles page first.';
      return;
    }

    const installPath =
      this.settings.stores[this.settings.selectedStoreId]?.games[this.settings.selectedGameId]
        ?.installPath ?? '';

    if (!installPath.trim()) {
      this.statusMessage = 'Set install path in Settings before adding mods.';
      return;
    }

    this.statusMessage = `Downloading ${approved.name}...`;
    const destination = toDownloadedModPath(installPath, approved.id);
    const extractedPath = await downloadAndExtractZip(approved.downloadUrl, destination);
    if (!extractedPath) {
      this.statusMessage = `Failed to download/extract '${approved.name}'.`;
      return;
    }

    const current = this.modByApprovedId(profileId, approved.id);
    const latestCatalogItem = this.findOnlineItemByApprovedId(approved.id);
    const modEntry = importModFromFolder(extractedPath, {
      id: approved.id,
      name: approved.name,
      description: approved.description,
    });
    modEntry.approvedModId = approved.id;
    modEntry.modioModId = latestCatalogItem?.modio?.id;
    modEntry.modioProfileUrl = latestCatalogItem?.profileUrl || approved.modIoUrl;
    modEntry.modioFileId = latestCatalogItem?.modio?.modfileId;
    modEntry.modioVersion = latestCatalogItem?.modio?.modfileVersion;
    modEntry.installState = 'installed';
    modEntry.selectedOptions = {
      ...approved.options.reduce<Record<string, boolean>>((acc, option) => {
        if (option.lockedChecked) acc[option.id] = true;
        return acc;
      }, {}),
      ...(current?.selectedOptions ?? {}),
    };

    this.settings = addModToProfile(
      this.settings,
      this.settings.selectedStoreId,
      this.settings.selectedGameId,
      profileId,
      modEntry,
    );
    saveSettings(this.storage, this.settings);

    await saveProfileSelection(profileId, approved.id, modEntry.selectedOptions ?? {});
    if (!this.profileSelectionsByProfileId[profileId]) {
      this.profileSelectionsByProfileId[profileId] = {};
    }
    this.profileSelectionsByProfileId[profileId][approved.id] = modEntry.selectedOptions ?? {};
    this.statusMessage = `'${approved.name}' added to profile.`;
  }

  async updateMod(mod: ModEntry): Promise<void> {
    if (!this.isUpdateAvailable(mod) || this.isStoredModBusy(mod)) {
      return;
    }

    const item = this.catalogItemForMod(mod);
    await this.runBusyItem(item.key, 'update', async () => {
      if (mod.approvedModId) {
        const approved = getApprovedMod(mod.approvedModId);
        if (!approved) return;
        await this.addApprovedMod(this.activeProfileId, approved);
        return;
      }

      await this.installOnlineItem(item, `Updating ${item.name}...`);
    });
  }

  removeInstalledMod(mod: ModEntry): void {
    if (!this.activeProfileId) {
      this.statusMessage = 'Select an active profile on the Profiles page first.';
      return;
    }

    this.settings = removeModFromProfile(
      this.settings,
      this.settings.selectedStoreId,
      this.settings.selectedGameId,
      this.activeProfileId,
      mod.id,
    );
    saveSettings(this.storage, this.settings);

    const action = mod.modioModId || mod.approvedModId ? 'unsubscribed from' : 'removed from';
    this.statusMessage = `'${mod.name}' ${action} profile.`;
  }

  async updateAll(): Promise<void> {
    if (!this.activeProfileId) return;
    const updatableMods = this.installedMods.filter((m) => this.isUpdateAvailable(m));
    if (updatableMods.length === 0) {
      this.statusMessage = 'No approved mods to update.';
      return;
    }
    this.statusMessage = `Updating ${updatableMods.length} mod(s)...`;
    for (const mod of updatableMods) {
      await this.updateMod(mod);
    }
    this.statusMessage = 'All mods updated.';
  }

  async toggleOption(
    profileId: string,
    approvedModId: string,
    optionId: string,
    checked: boolean,
  ): Promise<void> {
    const approved = getApprovedMod(approvedModId);
    const existing = this.modByApprovedId(profileId, approvedModId);
    if (!approved || !existing) return;

    const option = approved.options.find((entry) => entry.id === optionId);
    if (!option || option.lockedChecked) return;

    const updated: ModEntry = {
      ...existing,
      selectedOptions: { ...(existing.selectedOptions ?? {}), [optionId]: checked },
    };

    this.settings = addModToProfile(
      this.settings,
      this.settings.selectedStoreId,
      this.settings.selectedGameId,
      profileId,
      updated,
    );
    saveSettings(this.storage, this.settings);

    await saveProfileSelection(profileId, approvedModId, updated.selectedOptions ?? {});
    if (!this.profileSelectionsByProfileId[profileId]) {
      this.profileSelectionsByProfileId[profileId] = {};
    }
    this.profileSelectionsByProfileId[profileId][approvedModId] = updated.selectedOptions ?? {};
  }

  onSearchInput(value: string): void {
    this.searchQuery = value;
    void this.onSearchChange();
  }

  async onSearchChange(): Promise<void> {
    try {
      this.approvedMods = await searchCatalog(this.searchQuery, 200);
      if (this.activeTab === 'online') {
        this.modioMods = await searchModioCatalog(this.searchQuery, 2000);
      }
    } catch {
      // Keep existing list when DB search is unavailable.
    }
  }

  async loadModioCatalog(): Promise<void> {
    this.modioLoading = true;
    this.modioError = '';
    const modioApiKey = getModioApiKey();

    try {
      this.modioMods = await searchModioCatalog(this.searchQuery, 2000);

      const shouldRefreshFromApi =
        Boolean(modioApiKey.trim()) &&
        (!this.hasHydratedModioCache || this.modioMods.length === 0 || !this.searchQuery.trim());
      if (shouldRefreshFromApi) {
        const allItems = await fetchAllModioCatalog({
          gameId: MODIO_GAME_ID,
          apiKey: modioApiKey,
          pageSize: 100,
          maxPages: 200,
        });
        await syncModioCatalog(allItems);
        this.hasHydratedModioCache = true;
        this.modioMods = await searchModioCatalog(this.searchQuery, 2000);
      }

      if (!modioApiKey.trim() && this.modioMods.length === 0) {
        this.modioError = 'mod.io API key is not configured for this build.';
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.modioError =
        this.modioMods.length > 0
          ? `Using cached mod.io catalog. Refresh failed: ${message}`
          : message;
    } finally {
      this.modioLoading = false;
    }
  }

  openModProfile(profileUrl: string): void {
    if (!profileUrl) {
      return;
    }

    if (typeof window !== 'undefined') {
      window.open(profileUrl, '_blank', 'noopener,noreferrer');
    }
  }

  isModioSubscribed(item: OnlineCatalogItem): boolean {
    return Boolean(this.subscriptionEntryForItem(item));
  }

  isCatalogItemInstalled(item: OnlineCatalogItem): boolean {
    const existing = this.subscriptionEntryForItem(item);
    return existing ? this.isInstalledModEntry(existing) : false;
  }

  isOnlineItemBusy(item: OnlineCatalogItem, action?: 'subscribe' | 'install' | 'update'): boolean {
    if (this.busyItemKey !== item.key) {
      return false;
    }

    return action ? this.busyItemAction === action : true;
  }

  isStoredModBusy(mod: ModEntry, action?: 'install' | 'update'): boolean {
    const item = this.catalogItemForMod(mod);
    return this.isOnlineItemBusy(item, action);
  }

  approvedEntryForItem(item: OnlineCatalogItem): ModEntry | undefined {
    if (!item.approved) {
      return undefined;
    }

    return this.modByApprovedId(this.activeProfileId, item.approved.id);
  }

  async toggleModioSubscription(item: OnlineCatalogItem): Promise<void> {
    if (this.isOnlineItemBusy(item)) {
      return;
    }

    if (this.isModioSubscribed(item)) {
      this.unsubscribeOnlineItem(item);
      return;
    }

    await this.runBusyItem(item.key, 'subscribe', async () => {
      await this.subscribeOnlineItem(item);
    });
  }

  async installSubscribedItem(item: OnlineCatalogItem): Promise<void> {
    if (this.isOnlineItemBusy(item)) {
      return;
    }

    await this.runBusyItem(item.key, 'install', async () => {
      await this.installOnlineItem(item, `Installing ${item.name}...`);
    });
  }

  private modByModioId(profileId: string, modioModId: number): ModEntry | undefined {
    if (!profileId) return undefined;
    const mods = Object.values(
      getModsForProfile(
        this.settings,
        this.settings.selectedStoreId,
        this.settings.selectedGameId,
        profileId,
      ),
    );
    const matches = mods.filter((m) => m.modioModId === modioModId);
    return matches.find((m) => this.isInstalledModEntry(m)) ?? matches[0];
  }

  private async subscribeOnlineItem(item: OnlineCatalogItem): Promise<void> {
    if (!this.activeProfileId) {
      this.statusMessage = 'Select an active profile on the Profiles page first.';
      return;
    }

    const existing = this.subscriptionEntryForItem(item);
    const approved = item.approved;
    const modId = approved?.id ?? `modio-${item.modio?.id ?? item.key}`;
    const selectedOptions = approved
      ? {
          ...approved.options.reduce<Record<string, boolean>>((acc, option) => {
            if (option.lockedChecked) acc[option.id] = true;
            return acc;
          }, {}),
          ...(existing?.selectedOptions ?? {}),
        }
      : existing?.selectedOptions;

    const modEntry: ModEntry = {
      id: modId,
      name: item.name,
      sourceFolderPath: existing?.sourceFolderPath ?? '',
      importedAt: existing?.importedAt ?? new Date().toISOString(),
      installState: this.isInstalledModEntry(existing ?? ({ sourceFolderPath: '' } as ModEntry))
        ? 'installed'
        : 'subscribed',
      description: item.summary,
      approvedModId: approved?.id,
      modioModId: item.modio?.id ?? existing?.modioModId,
      modioProfileUrl: item.profileUrl,
      modioFileId: item.modio?.modfileId ?? existing?.modioFileId,
      modioVersion: item.modio?.modfileVersion ?? existing?.modioVersion,
      selectedOptions,
    };

    this.settings = addModToProfile(
      this.settings,
      this.settings.selectedStoreId,
      this.settings.selectedGameId,
      this.activeProfileId,
      modEntry,
    );
    saveSettings(this.storage, this.settings);

    if (approved) {
      await saveProfileSelection(this.activeProfileId, approved.id, selectedOptions ?? {});
      if (!this.profileSelectionsByProfileId[this.activeProfileId]) {
        this.profileSelectionsByProfileId[this.activeProfileId] = {};
      }
      this.profileSelectionsByProfileId[this.activeProfileId][approved.id] = selectedOptions ?? {};
    }

    this.statusMessage = `'${item.name}' subscribed. Install it from the Subscribed tab.`;
  }

  private unsubscribeOnlineItem(item: OnlineCatalogItem): void {
    if (!this.activeProfileId) {
      this.statusMessage = 'Select an active profile on the Profiles page first.';
      return;
    }

    const existing = item.approved
      ? this.modByApprovedId(this.activeProfileId, item.approved.id)
      : item.modio
        ? this.modByModioId(this.activeProfileId, item.modio.id)
        : undefined;

    if (!existing) {
      this.statusMessage = `'${item.name}' is not currently subscribed in this profile.`;
      return;
    }

    this.settings = removeModFromProfile(
      this.settings,
      this.settings.selectedStoreId,
      this.settings.selectedGameId,
      this.activeProfileId,
      existing.id,
    );
    saveSettings(this.storage, this.settings);
    this.statusMessage = `'${item.name}' removed from profile.`;
  }

  isUpdateAvailable(mod: ModEntry): boolean {
    if (!this.isInstalledModEntry(mod)) {
      return false;
    }

    const latestFileId = this.catalogItemForMod(mod).modio?.modfileId ?? 0;
    if (!latestFileId) {
      return false;
    }

    if (!mod.modioFileId) {
      return true;
    }

    return mod.modioFileId !== latestFileId;
  }

  private subscriptionEntryForItem(item: OnlineCatalogItem): ModEntry | undefined {
    if (item.approved) {
      const approvedEntry = this.modByApprovedId(this.activeProfileId, item.approved.id);
      if (approvedEntry) {
        return approvedEntry;
      }
    }

    if (item.modio) {
      return this.modByModioId(this.activeProfileId, item.modio.id);
    }

    return undefined;
  }

  private findOnlineItemByApprovedId(approvedId: string): OnlineCatalogItem | undefined {
    return this.onlineCatalogItems.find((item) => item.approved?.id === approvedId);
  }

  private catalogItemForMod(mod: ModEntry): OnlineCatalogItem {
    const matched = mod.approvedModId
      ? this.findOnlineItemByApprovedId(mod.approvedModId)
      : mod.modioModId
        ? this.onlineCatalogItems.find((item) => item.modio?.id === mod.modioModId)
        : undefined;

    if (matched) {
      return matched;
    }

    const approved = mod.approvedModId ? getApprovedMod(mod.approvedModId) : undefined;
    return {
      key: `stored:${mod.id}`,
      name: mod.name,
      summary: mod.description ?? approved?.description ?? '',
      profileUrl: mod.modioProfileUrl ?? approved?.modIoUrl ?? '',
      thumbnailUrl: '',
      downloadUrl: approved?.downloadUrl ?? '',
      tags: [],
      dateUpdated: 0,
      downloadsTotal: 0,
      subscribersTotal: 0,
      modio: mod.modioModId
        ? {
            id: mod.modioModId,
            name: mod.name,
            summary: mod.description ?? '',
            profileUrl: mod.modioProfileUrl ?? '',
            thumbnailUrl: '',
            downloadUrl: approved?.downloadUrl ?? '',
            modfileId: mod.modioFileId ?? 0,
            modfileVersion: mod.modioVersion ?? '',
            tags: [],
            dateUpdated: 0,
            downloadsTotal: 0,
            subscribersTotal: 0,
          }
        : undefined,
      approved,
    };
  }

  private async installOnlineItem(item: OnlineCatalogItem, actionLabel: string): Promise<void> {
    if (!this.activeProfileId) {
      this.statusMessage = 'Select an active profile on the Profiles page first.';
      return;
    }

    if (!item.downloadUrl.trim()) {
      this.statusMessage = `No downloadable file available for '${item.name}'.`;
      return;
    }

    const installPath =
      this.settings.stores[this.settings.selectedStoreId]?.games[this.settings.selectedGameId]
        ?.installPath ?? '';

    if (!installPath.trim()) {
      this.statusMessage = 'Set install path in Settings before adding mods.';
      return;
    }

    this.statusMessage = actionLabel;

    if (item.approved) {
      await this.addApprovedMod(this.activeProfileId, item.approved);
      return;
    }

    if (!item.modio) {
      this.statusMessage = `No downloadable file available for '${item.name}'.`;
      return;
    }

    const existing = this.subscriptionEntryForItem(item);
    const destination = toDownloadedModPath(installPath, `modio-${item.modio.id}`);
    const extractedPath = await downloadAndExtractZip(item.downloadUrl, destination);
    if (!extractedPath) {
      this.statusMessage = `Failed to download/extract '${item.name}'.`;
      return;
    }

    const modEntry = importModFromFolder(extractedPath, {
      id: existing?.id ?? `modio-${item.modio.id}`,
      name: item.name,
      description: item.summary,
    });
    modEntry.installState = 'installed';
    modEntry.modioModId = item.modio.id;
    modEntry.modioProfileUrl = item.profileUrl;
    modEntry.modioFileId = item.modio.modfileId;
    modEntry.modioVersion = item.modio.modfileVersion;
    modEntry.selectedOptions = existing?.selectedOptions;

    this.settings = addModToProfile(
      this.settings,
      this.settings.selectedStoreId,
      this.settings.selectedGameId,
      this.activeProfileId,
      modEntry,
    );
    saveSettings(this.storage, this.settings);
    this.statusMessage = `'${item.name}' installed.`;
  }

  private async runBusyItem(
    key: string,
    action: 'subscribe' | 'install' | 'update',
    work: () => Promise<void>,
  ): Promise<void> {
    this.busyItemKey = key;
    this.busyItemAction = action;
    try {
      await work();
    } finally {
      this.busyItemKey = null;
      this.busyItemAction = null;
    }
  }

  private refreshProfiles(): void {
    this.profiles = getProfiles(
      this.settings,
      this.settings.selectedStoreId,
      this.settings.selectedGameId,
    );
    void this.loadProfileSelectionsForVisibleProfiles();
  }

  private async initializeCatalog(): Promise<void> {
    try {
      await syncCatalog(APPROVED_MODS);
      this.approvedMods = await searchCatalog('', 200);
    } catch {
      this.approvedMods = [...APPROVED_MODS];
    }
  }

  private async loadProfileSelectionsForVisibleProfiles(): Promise<void> {
    const next: Record<string, Record<string, Record<string, boolean>>> = {};
    for (const profile of this.profiles) {
      try {
        next[profile.id] = await loadProfileSelections(profile.id);
      } catch {
        next[profile.id] = {};
      }
    }
    this.profileSelectionsByProfileId = next;
  }

  private resolveStorage(): StorageLike {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
    const store = new Map<string, string>();
    return { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) };
  }
}
