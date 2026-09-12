import { describe, expect, it } from "vitest";
import { displayToken, fullSpec, greetingForName, rupees } from "./format";

describe("displayToken", () => {
  it("renders queue IDs as Q-numbers", () => {
    expect(displayToken("XR-184")).toBe("Q184");
    expect(displayToken("Q184")).toBe("Q184");
  });
});

describe("rupees", () => {
  it("formats whole rupees without decimals", () => {
    expect(rupees(4000)).toBe("₹40");
  });
  it("formats paise with two decimals", () => {
    expect(rupees(425)).toBe("₹4.25");
  });
});

describe("fullSpec", () => {
  it("joins the approved parts ordering", () => {
    expect(
      fullSpec({ pageCount: 20, copies: 2, paperSize: "A4", colorMode: "bw", sides: "double" })
    ).toBe("20 pages · 2 copies · A4 · B&W · Double");
  });
});

describe("greetingForName", () => {
  it("uses the first name", () => {
    expect(greetingForName("Arjun Menon")).toContain("Arjun");
  });
});