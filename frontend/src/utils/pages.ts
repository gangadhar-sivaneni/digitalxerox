export type RangeMode = "all" | "custom";

export interface RangeOk {
  ok: true;
  pageRange: string;
  pageCount: number;
  mode: RangeMode;
}

export interface RangeErr {
  ok: false;
  message: string;
}

export type PageRangeResult = RangeOk | RangeErr;

/**
 * Client-side mirror of the backend page-range validator (backend is still
 * authoritative). Supports "1-5, 8, 10-15", em-dashes and rejects reversed,
 * negative, out-of-range or non-numeric input. Overlapping ranges count each
 * page once.
 */
export function parsePageRange(input: string, totalPages: number): PageRangeResult {
  const trimmed = input.trim();
  if (!trimmed || trimmed.toLowerCase() === "all") {
    return { ok: true, pageRange: "all", pageCount: totalPages, mode: "all" };
  }

  const parts = trimmed
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length === 0) {
    return { ok: false, message: "Please enter a page range." };
  }

  const set = new Set<number>();
  for (const part of parts) {
    const norm = part.replace(/[–—]/g, "-");
    if (norm.includes("-")) {
      const seg = norm.split("-");
      if (seg.length !== 2) {
        return { ok: false, message: `"${part}" is not a valid page range.` };
      }
      const a = parseInt(seg[0], 10);
      const b = parseInt(seg[1], 10);
      if (!Number.isInteger(a) || !Number.isInteger(b)) {
        return { ok: false, message: `"${part}" is not a valid page range.` };
      }
      if (a < 1 || b < 1 || a > b) {
        return { ok: false, message: `Range "${part}" is reversed or invalid.` };
      }
      if (b > totalPages) {
        return {
          ok: false,
          message: `Range "${part}" exceeds the document's ${totalPages} pages.`,
        };
      }
      for (let i = a; i <= b; i++) set.add(i);
    } else {
      const n = parseInt(norm, 10);
      if (!Number.isInteger(n) || n < 1 || String(n) !== norm) {
        return { ok: false, message: `"${part}" is not a valid page number.` };
      }
      if (n > totalPages) {
        return {
          ok: false,
          message: `Page ${n} exceeds the document's ${totalPages} pages.`,
        };
      }
      set.add(n);
    }
  }
  if (set.size === 0) {
    return { ok: false, message: "The page range selected no pages." };
  }
  return { ok: true, pageRange: trimmed, pageCount: set.size, mode: "custom" };
}