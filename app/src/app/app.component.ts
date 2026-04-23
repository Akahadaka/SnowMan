import { Component, OnInit } from "@angular/core";
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from "@angular/router";
import { getAppTitle } from "./ping.bridge";
import { shellNavigationItems } from "./shell.navigation";
import { loadSettings } from "./settings.persistence";
import { resolveStartupRoute } from "./startup.routing";

@Component({
  selector: "app-root",
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: "./app.component.html",
  styleUrl: "./app.component.css",
})
export class AppComponent implements OnInit {
  title = getAppTitle();
  navigationItems = shellNavigationItems;

  constructor(private readonly router: Router) {}

  ngOnInit(): void {
    const settings = loadSettings(typeof localStorage !== "undefined" ? localStorage : {
      getItem: () => null,
      setItem: () => undefined,
    });
    const target = resolveStartupRoute(settings);
    void this.router.navigate([target]);
  }
}
