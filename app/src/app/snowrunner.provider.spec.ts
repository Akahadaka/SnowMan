import { describe, expect, it } from "vitest";
import { snowrunnerProvider } from "./snowrunner.provider";

describe("snowrunner provider", () => {
  it("accepts paths containing SnowRunner", () => {
    const result = snowrunnerProvider.validateInstallPath(
      "C:/Program Files (x86)/Steam/steamapps/common/SnowRunner",
    );

    expect(result.isValid).toBe(true);
  });

  it("rejects paths that are clearly not SnowRunner", () => {
    const result = snowrunnerProvider.validateInstallPath("C:/Games/OtherGame");

    expect(result.isValid).toBe(false);
    expect(result.reason).toBeTruthy();
  });
});
