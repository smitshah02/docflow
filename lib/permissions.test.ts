import { describe, expect, it } from "vitest";
import { accessLevel, canEdit, canManageSharing, validateShareTarget } from "./permissions";

describe("document ownership / access", () => {
  it("owner beats shared; neither means none", () => {
    expect(accessLevel(true, false)).toBe("owner");
    expect(accessLevel(true, true)).toBe("owner");
    expect(accessLevel(false, true)).toBe("shared");
    expect(accessLevel(false, false)).toBe("none");
  });

  it("owners and shared users can edit; strangers cannot", () => {
    expect(canEdit("owner")).toBe(true);
    expect(canEdit("shared")).toBe(true);
    expect(canEdit("none")).toBe(false);
  });
});

describe("sharing permissions", () => {
  it("only the owner can manage sharing (shared users cannot re-share)", () => {
    expect(canManageSharing("owner")).toBe(true);
    expect(canManageSharing("shared")).toBe(false);
    expect(canManageSharing("none")).toBe(false);
  });

  it("rejects sharing with yourself", () => {
    expect(validateShareTarget("alice", "alice")).toMatch(/yourself/);
    expect(validateShareTarget("alice", "bob")).toBeNull();
  });
});
