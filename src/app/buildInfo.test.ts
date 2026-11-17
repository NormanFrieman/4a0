import { describe, expect, it } from "vitest";
import { sourceLink } from "./buildInfo.ts";

describe("sourceLink", () => {
  it("points to the build's commit", () => {
    expect(sourceLink("https://github.com/x/y", "abc123")).toBe(
      "https://github.com/x/y/tree/abc123",
    );
  });

  it("falls back to the repository without a commit", () => {
    expect(sourceLink("https://github.com/x/y", "")).toBe("https://github.com/x/y");
  });
});
