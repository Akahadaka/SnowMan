import { describe, expect, it, vi } from "vitest";
import { fetchPing, getAppTitle } from "./ping.bridge";
import { shellNavigationItems } from "./shell.navigation";

describe("app shell configuration", () => {
  it("exposes Snowman branding and primary navigation items", () => {
    expect(getAppTitle()).toBe("Snowman");
    expect(shellNavigationItems).toEqual([
      { label: "Dashboard", path: "/dashboard" },
      { label: "Profiles", path: "/profiles" },
      { label: "Mods", path: "/mods" },
      { label: "Settings", path: "/settings" },
    ]);
  });

  it("keeps the ping bridge callable from the shell", async () => {
    const invokeFn = vi.fn().mockResolvedValue("pong");

    const result = await fetchPing(invokeFn);

    expect(invokeFn).toHaveBeenCalledWith("ping");
    expect(result).toBe("pong");
  });
});
