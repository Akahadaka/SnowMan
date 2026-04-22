import { Routes } from "@angular/router";
import { DashboardPageComponent } from "./dashboard-page.component";
import { ModsPageComponent } from "./mods-page.component";
import { ProfilesPageComponent } from "./profiles-page.component";
import { SettingsPageComponent } from "./settings-page.component";

export const routes: Routes = [
  { path: "", redirectTo: "dashboard", pathMatch: "full" },
  { path: "dashboard", component: DashboardPageComponent },
  { path: "profiles", component: ProfilesPageComponent },
  { path: "mods", component: ModsPageComponent },
  { path: "settings", component: SettingsPageComponent },
];
