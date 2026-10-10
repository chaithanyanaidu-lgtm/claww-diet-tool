import { describe, expect, it } from "vitest";
import { isPrivatePath } from "@/lib/private-paths";
import { safeNext } from "@/lib/safe-next";

describe("safeNext", () => {
  it.each([
    ["/plans", "/plans"],
    ["/plan/preview?save=1", "/plan/preview?save=1"],
    ["/plan/abc", "/plan/abc"],
  ])("keeps same-site path %s", (input, expected) => {
    expect(safeNext(input)).toBe(expected);
  });

  it.each([
    "https://evil.example/x",
    "//evil.example",
    "/\\evil.example",
    "javascript:alert(1)",
    "plans",
    "",
    null,
    undefined,
    42,
  ])("falls back for %s", (input) => {
    expect(safeNext(input)).toBe("/plans");
    expect(safeNext(input, "/")).toBe("/");
  });
});

describe("isPrivatePath", () => {
  it.each(["/plans", "/plans/", "/plan/0b6e3c3a-1111-4111-8111-111111111111", "/plan/anything"])("guards %s", (p) => {
    expect(isPrivatePath(p)).toBe(true);
  });

  it.each(["/", "/login", "/plan/new", "/plan/preview", "/plan/new/", "/auth/confirm", "/plansx", "/plan/a/b"])(
    "leaves %s public",
    (p) => {
      expect(isPrivatePath(p)).toBe(false);
    },
  );
});
