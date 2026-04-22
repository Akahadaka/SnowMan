import { Component } from "@angular/core";
import { RouterLink, RouterLinkActive, RouterOutlet } from "@angular/router";
import { fetchPing, getAppTitle } from "./ping.bridge";
import { shellNavigationItems } from "./shell.navigation";
import { tauriInvoke, type TauriInvokeFn } from "./tauri.bridge";

@Component({
  selector: "app-root",
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: "./app.component.html",
  styleUrl: "./app.component.css",
})
export class AppComponent {
  title = getAppTitle();
  navigationItems = shellNavigationItems;
  greetingMessage = "";

  async ping(invokeFn: TauriInvokeFn = tauriInvoke): Promise<void> {
    this.greetingMessage = await fetchPing(invokeFn);
  }
}
