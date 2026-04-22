import { Component } from "@angular/core";

@Component({
  selector: "app-dashboard-page",
  standalone: true,
  template: `
    <section class="page">
      <p class="eyebrow">Dashboard</p>
      <h2>Workspace Overview</h2>
      <p>Snowman is ready to host profile, mod, and diagnostics features.</p>
    </section>
  `,
})
export class DashboardPageComponent {}