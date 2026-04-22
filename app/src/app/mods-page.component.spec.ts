import { describe, expect, it, vi } from "vitest";
import { ModsPageComponent } from "./mods-page.component";
import * as dialogBridge from "./dialog.bridge";

describe("ModsPageComponent", () => {
  it("renders without errors", () => {
    const component = new ModsPageComponent();
    expect(component).toBeTruthy();
  });

  it("emits importMod output when import is triggered", async () => {
    vi.spyOn(dialogBridge, "pickDirectory").mockResolvedValue(null);
    const component = new ModsPageComponent();
    let emitCount = 0;
    component.importMod.subscribe(() => emitCount++);
    await component.triggerImport("profile-1");
    expect(emitCount).toBe(1);
  });
});
