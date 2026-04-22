import { describe, expect, it } from "vitest";
import { ModsPageComponent } from "./mods-page.component";

describe("ModsPageComponent", () => {
  it("renders without errors", () => {
    const component = new ModsPageComponent();
    expect(component).toBeTruthy();
  });

  it("emits importMod output when import is triggered", () => {
    const component = new ModsPageComponent();
    let emitCount = 0;
    component.importMod.subscribe(() => emitCount++);
    component.triggerImport();
    expect(emitCount).toBe(1);
  });
});
