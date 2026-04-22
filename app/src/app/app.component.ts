import { Component } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import { invoke } from "@tauri-apps/api/core";
import { fetchPing, getAppTitle } from "./ping.bridge";

@Component({
  selector: "app-root",
  imports: [RouterOutlet],
  templateUrl: "./app.component.html",
  styleUrl: "./app.component.css",
})
export class AppComponent {
  title = getAppTitle();
  greetingMessage = "";

  async ping(): Promise<void> {
    this.greetingMessage = await fetchPing((command) => invoke<string>(command));
  }
}
