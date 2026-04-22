import { Component } from "@angular/core";
import { RouterLink, RouterLinkActive, RouterOutlet } from "@angular/router";
import { invoke } from "@tauri-apps/api/core";
import { fetchPing, getAppTitle } from "./ping.bridge";
import { shellNavigationItems } from "./shell.navigation";

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

  async ping(
    invokeFn: (command: string) => Promise<string> = (command) => invoke<string>(command),
  ): Promise<void> {
    this.greetingMessage = await fetchPing(invokeFn);
  }
}
