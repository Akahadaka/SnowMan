import "@angular/compiler";
import { describe, expect, it } from "vitest";
import { routes } from "./app.routes";

describe("app routes", () => {
  it("redirects the empty path to dashboard", () => {
    const redirectRoute = routes.find((route) => route.path === "");

    expect(redirectRoute?.redirectTo).toBe("dashboard");
  });

  it("defines the primary top-level routes", () => {
    const paths = routes.map((route) => route.path);

    expect(paths).toEqual(["", "dashboard", "profiles", "mods", "settings"]);
  });
});
