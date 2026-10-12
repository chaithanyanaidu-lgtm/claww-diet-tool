import { describe, expect, it } from "vitest";
import { CREATOR } from "@/lib/creator";

describe("creator details", () => {
  it("match the project submission", () => {
    expect(CREATOR).toEqual({
      name: "P. Chaithanya",
      rollNumber: "2473A05185",
      department: "Computer Science and Engineering (CSE)",
      college: "PBR VITS",
    });
  });
});
