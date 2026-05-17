import { describe, expect, it } from 'vitest';
import { ModsPageComponent } from './mods-page.component';

describe('ModsPageComponent', () => {
  it('renders without errors', () => {
    const component = new ModsPageComponent();
    expect(component).toBeTruthy();
  });

  it('exposes at least one approved mod', () => {
    const component = new ModsPageComponent();
    expect(component.approvedMods.length).toBeGreaterThan(0);
    expect(component.approvedMods[0].id).toBe('real-life-mod');
  });

  it("defaults activeTab to 'installed'", () => {
    const component = new ModsPageComponent();
    expect(component.activeTab).toBe('installed');
  });

  it('installedMods returns empty array when no active profile', () => {
    const component = new ModsPageComponent();
    expect(component.installedMods).toEqual([]);
  });

  it('toggleExpand sets expandedModId', () => {
    const component = new ModsPageComponent();
    component.toggleExpand('some-mod');
    expect(component.expandedModId).toBe('some-mod');
  });

  it('toggleExpand collapses when same mod clicked twice', () => {
    const component = new ModsPageComponent();
    component.toggleExpand('some-mod');
    component.toggleExpand('some-mod');
    expect(component.expandedModId).toBeNull();
  });

  it('updateAll resolves without error when no mods installed', async () => {
    const component = new ModsPageComponent();
    await expect(component.updateAll()).resolves.toBeUndefined();
  });
});
