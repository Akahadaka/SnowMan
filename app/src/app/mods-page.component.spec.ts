import { describe, expect, it } from "vitest";
import { ModsPageComponent } from "./mods-page.component";

describe("ModsPageComponent", () => {
  it("renders without errors", () => {
    const component = new ModsPageComponent();
    expect(component).toBeTruthy();
  });

  it("exposes at least one approved mod", () => {
    const component = new ModsPageComponent();
    expect(component.approvedMods.length).toBeGreaterThan(0);
    expect(component.approvedMods[0].id).toBe("real-life-mod");
  });
});
