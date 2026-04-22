import { describe, expect, it, vi } from "vitest";
import { registeredCommands, type TauriInvokeFn } from "./tauri.bridge";
import { fetchPing } from "./ping.bridge";

describe("typed Tauri command bridge", () => {
  it("registers the ping command", () => {
    expect(registeredCommands).toContain("ping");
  });

  it("covers exactly the expected command set", () => {
    expect([...registeredCommands]).toEqual(["ping"]);
  });

  it("fetchPing calls the typed invoke function with the ping command", async () => {
    const mockInvoke = vi.fn().mockResolvedValue("pong") as unknown as TauriInvokeFn;

    const result = await fetchPing(mockInvoke);

    expect(mockInvoke).toHaveBeenCalledOnce();
    expect(mockInvoke).toHaveBeenCalledWith("ping");
    expect(result).toBe("pong");
  });
});
