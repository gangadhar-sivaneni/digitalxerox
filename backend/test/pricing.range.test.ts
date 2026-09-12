import { describe, expect, it } from "vitest";
import {
  parsePageRange,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  PageRangeResult,
} from "../src/services/pricing.range";
import { ApiError } from "../src/utils/errors";

function expectUnprocessable(fn: () => unknown, needle?: string) {
  try {
    fn();
    expect.unreachable("Expected an ApiError to be thrown");
  } catch (err) {
    expect(err).toBeInstanceOf(ApiError);
    if (needle) {
      expect((err as ApiError).message).toContain(needle);
    }
  }
}

describe("parsePageRange", () => {
  it("treats null/empty/\"all\" as the whole document", () => {
    expect(parsePageRange(null, 20)).toEqual({ pageRange: "all", pageCount: 20, mode: "all" });
    expect(parsePageRange("", 20)).toEqual({ pageRange: "all", pageCount: 20, mode: "all" });
    expect(parsePageRange("  all  ", 20)).toEqual({ pageRange: "all", pageCount: 20, mode: "all" });
    expect(parsePageRange("ALL", 20)).toEqual({ pageRange: "all", pageCount: 20, mode: "all" });
  });

  it("supports comma or em-dash separated ranges like 1-5, 8, 10-15", () => {
    expect(parsePageRange("1-5, 8, 10-15", 20)).toEqual({
      pageRange: "1-5, 8, 10-15",
      pageCount: 12,
      mode: "custom",
    });
    expect(parsePageRange("1–5,8", 20)).toEqual({
      pageRange: "1–5,8",
      pageCount: 6,
      mode: "custom",
    });
  });

  it("dedupes overlapping ranges so each page counts once", () => {
    // 1-5 ∪ 3-7 → pages 1,2,3,4,5,6,7 = 7 unique pages (not 10).
    expect(parsePageRange("1-5, 3-7", 10).pageCount).toBe(7);
    // Overlapping segments still count each page once.
    expect(parsePageRange("1-3, 3-5, 5-7", 10).pageCount).toBe(7);
  });

  it("rejects non-numeric garbage", () => {
    expectUnprocessable(() => parsePageRange("abc", 20), "not a valid page number");
    expectUnprocessable(() => parsePageRange("1-abc", 20), "not a valid page range");
    expectUnprocessable(() => parsePageRange("1-x-5", 20), "not a valid page range");
  });

  it("rejects reversed ranges", () => {
    expectUnprocessable(() => parsePageRange("5-3", 20), "reversed or invalid");
  });

  it("rejects zero, negatives and out-of-range pages", () => {
    expectUnprocessable(() => parsePageRange("0", 20));
    expectUnprocessable(() => parsePageRange("0-5", 20));
    expectUnprocessable(() => parsePageRange("-5", 20));
    expectUnprocessable(() => parsePageRange("21", 20), "exceeds the document's 20 pages");
    expectUnprocessable(() => parsePageRange("1-21", 20), "exceeds");
  });

  it("never counts more pages than the document has", () => {
    expect(parsePageRange("1,2,3", 3).pageCount).toBe(3);
    expectUnprocessable(() => parsePageRange("1,2,3,4", 3));
  });
});