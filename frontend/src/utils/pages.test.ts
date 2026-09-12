import { describe, expect, it } from "vitest";
import { parsePageRange } from "./pages";

describe("parsePageRange (client mirror)", () => {
  it("treats empty/\"/all\" as the whole document", () => {
    expect(parsePageRange("", 20)).toMatchObject({ ok: true, pageCount: 20, mode: "all" });
    expect(parsePageRange("all", 20)).toMatchObject({ ok: true, pageCount: 20, mode: "all" });
  });

  it("accepts 1-5, 8, 10-15 and counts unique pages", () => {
    const r = parsePageRange("1-5, 8, 10-15", 20);
    expect(r).toMatchObject({ ok: true, pageCount: 12, mode: "custom" });
  });

  it("dedupes overlapping ranges", () => {
    const r = parsePageRange("1-5, 3-7", 10);
    expect(r).toMatchObject({ ok: true, pageCount: 7 });
  });

  it("rejects garbage, zero, negatives, reversed and out-of-range values", () => {
    expect(parsePageRange("abc", 20).ok).toBe(false);
    expect(parsePageRange("5-3", 20).ok).toBe(false);
    expect(parsePageRange("0-5", 20).ok).toBe(false);
    expect(parsePageRange("-5", 20).ok).toBe(false);
    expect(parsePageRange("21", 20).ok).toBe(false);
    expect(parsePageRange("1-21", 20).ok).toBe(false);
    expect(parsePageRange("1-abc", 20).ok).toBe(false);
  });
});