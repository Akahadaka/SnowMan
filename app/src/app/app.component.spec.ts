import { describe, expect, it, vi } from "vitest";
import { fetchPing, getAppTitle } from "./ping.bridge";

describe("ping.bridge", () => {
  it("returns Snowman as the app title", () => {
    expect(getAppTitle()).toBe("Snowman");
  });

  it("invokes ping and returns pong", async () => {
    const invokeFn = vi.fn().mockResolvedValue("pong");

    const result = await fetchPing(invokeFn);

    expect(invokeFn).toHaveBeenCalledWith("ping");
    expect(result).toBe("pong");
  });
});
