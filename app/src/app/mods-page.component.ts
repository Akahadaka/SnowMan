import { Component, EventEmitter, Output } from "@angular/core";

@Component({
  selector: "app-mods-page",
  standalone: true,
  template: `
    <section class="page">
      <p class="eyebrow">Mods</p>
      <h2>Mod Manager</h2>
      <button (click)="triggerImport()">Import Mod</button>
    </section>
  `,
})
export class ModsPageComponent {
  @Output() importMod = new EventEmitter<void>();

  triggerImport(): void {
    this.importMod.emit();
  }
}
