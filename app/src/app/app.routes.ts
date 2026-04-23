import { Routes } from "@angular/router";
import { DiscoveryLoadingPageComponent } from "./discovery-loading-page.component";
import { GameSelectPageComponent } from "./game-select-page.component";
import { ModsPageComponent } from "./mods-page.component";
import { ProfilesPageComponent } from "./profiles-page.component";
import { SettingsPageComponent } from "./settings-page.component";
import { StoreSelectPageComponent } from "./store-select-page.component";

export const routes: Routes = [
  { path: "", redirectTo: "game-select", pathMatch: "full" },
  { path: "game-select", component: GameSelectPageComponent },
  { path: "store-select", component: StoreSelectPageComponent },
  { path: "discovery-loading", component: DiscoveryLoadingPageComponent },
  { path: "profiles", component: ProfilesPageComponent },
  { path: "mods", component: ModsPageComponent },
  { path: "settings", component: SettingsPageComponent },
];
