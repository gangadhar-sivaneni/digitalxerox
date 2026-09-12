import { ApiError } from "../utils/errors";

export interface PageRangeResult {
  pageRange: string;
  pageCount: number;
  mode: "all" | "custom";
}

/**
 * Parses a human page range like "1-5, 8, 10-15" against the real page count.
 * The backend is authoritative: out-of-bounds, reversed, negative or
 * non-numeric ranges are rejected. Overlapping ranges ("1-5, 3-7") count
 * each page once — pageCount is always the number of unique pages.
 */
export function parsePageRange(
  input: string | null | undefined,
  totalPages: number
): PageRangeResult {
  if (!input || !input.trim() || input.trim().toLowerCase() === "all") {
    return { pageRange: "all", pageCount: totalPages, mode: "all" };
  }
  const parts = input
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length === 0) throw ApiError.unprocessable("Please enter a page range.");

  const set = new Set<number>();
  for (const part of parts) {
    const norm = part.replace(/[–—]/g, "-");
    if (norm.includes("-")) {
      const seg = norm.split("-");
      if (seg.length !== 2) {
        throw ApiError.unprocessable(`"${part}" is not a valid page range.`);
      }
      const a = parseInt(seg[0], 10);
      const b = parseInt(seg[1], 10);
      if (!Number.isInteger(a) || !Number.isInteger(b)) {
        throw ApiError.unprocessable(`"${part}" is not a valid page range.`);
      }
      if (a < 1 || b < 1 || a > b) {
        throw ApiError.unprocessable(`Range "${part}" is reversed or invalid.`);
      }
      if (b > totalPages) {
        throw ApiError.unprocessable(
          `Range "${part}" exceeds the document's ${totalPages} pages.`
        );
      }
      for (let i = a; i <= b; i++) set.add(i);
    } else {
      const n = parseInt(norm, 10);
      if (!Number.isInteger(n) || n < 1 || String(n) !== norm) {
        throw ApiError.unprocessable(`"${part}" is not a valid page number.`);
      }
      if (n > totalPages) {
        throw ApiError.unprocessable(
          `Page ${n} exceeds the document's ${totalPages} pages.`
        );
      }
      set.add(n);
    }
  }
  if (set.size === 0) {
    throw ApiError.unprocessable("The page range selected no pages.");
  }
  return { pageRange: input.trim(), pageCount: set.size, mode: "custom" };
}