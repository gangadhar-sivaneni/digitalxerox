import { unzipSync } from "fflate";
import { PDFDocument } from "pdf-lib";
import { ApiError } from "../utils/errors";

/**
 * Clean abstraction over how we extract page counts from uploaded documents.
 *
 * Each format maps to a processor; callers only see `pageCount` (exact when
 * `supportsExact` is true, otherwise null) plus a human `note`. Adding a new
 * format is a matter of registering a new processor here — nothing else in
 * the codebase needs to know about file internals.
 *
 * - PDF   → real page count via pdf-lib (exact).
 * - JPG/PNG → a single image file is exactly one page (exact).
 * - DOCX  → a best-effort estimate from extracted text; NOT exact, so the
 *   student is asked to confirm the page count before ordering.
 * - DOC   → legacy binary; extractable only by the student.
 */
export interface DocumentContent {
  buffer: Buffer;
  mimeType: string;
  fileName: string;
}

export interface DocumentAnalysis {
  pageCount: number | null;
  supportsExact: boolean;
  note?: string;
}

export type Processor = (content: DocumentContent) => Promise<DocumentAnalysis>;

const PDF_HEAD = Buffer.from("%PDF-");
const PK_HEAD = Buffer.from([0x50, 0x4b]);

const pdfProcessor: Processor = async ({ buffer }) => {
  if (!buffer.subarray(0, 5).equals(PDF_HEAD)) {
    throw ApiError.unprocessable("That file doesn't look like a valid PDF.");
  }
  try {
    const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const pageCount = doc.getPageCount();
    if (pageCount < 1) {
      throw ApiError.unprocessable("This PDF has no printable pages.");
    }
    return {
      pageCount,
      supportsExact: true,
      note: `${pageCount} page${pageCount === 1 ? "" : "s"} read from the PDF.`,
    };
  } catch {
    throw ApiError.unprocessable("Could not read this PDF. It may be corrupted or encrypted.");
  }
};

const imageProcessor: Processor = async ({ buffer, fileName }) => {
  const ext = extOf(fileName);
  if (ext === "jpg" || ext === "jpeg") {
    if (!(buffer[0] === 0xff && buffer[1] === 0xd8)) {
      throw ApiError.unprocessable("That file doesn't look like a valid JPEG.");
    }
  }
  if (ext === "png") {
    if (!(buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47)) {
      throw ApiError.unprocessable("That file doesn't look like a valid PNG.");
    }
  }
  return {
    pageCount: 1,
    supportsExact: true,
    note: "Each photo upload is treated as a single page.",
  };
};

const docxProcessor: Processor = async ({ buffer }) => {
  if (!buffer.subarray(0, 2).equals(PK_HEAD)) {
    throw ApiError.unprocessable("That file doesn't look like a valid .docx archive.");
  }
  const estimatedPages = await estimateDocxPages(buffer);
  return {
    pageCount: null,
    supportsExact: false,
    note: estimatedPages
      ? `Roughly ${estimatedPages} page${estimatedPages === 1 ? "" : "s"} — please confirm the exact page count.`
      : "Please confirm the exact page count.",
  };
};

const docProcessor: Processor = async () => ({
  pageCount: null,
  supportsExact: false,
  note: "Please enter the exact page count.",
});

/**
 * Best-effort DOCX page estimate: unzip word/document.xml, count plain-text
 * characters and divide by an average characters-per-page figure. This is
 * intentionally approximate — the order flow still asks the student to
 * confirm the count before ordering a DOCX/DOC upload.
 */
function estimateDocxPages(buffer: Buffer): number | null {
  try {
    const files = unzipSync(new Uint8Array(buffer)) as Record<string, Uint8Array>;
    const xml = files["word/document.xml"];
    if (!xml) return null;
    const text = Buffer.from(xml)
      .toString("utf8")
      .replace(/<w:tab[^>]*\/>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/&#160;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">");
    const chars = text.replace(/\s+/g, " ").trim().length;
    if (chars === 0) return null;
    return Math.max(1, Math.round(chars / 1800));
  } catch {
    return null;
  }
}

const processors: Record<string, Processor> = {
  pdf: pdfProcessor,
  jpg: imageProcessor,
  jpeg: imageProcessor,
  png: imageProcessor,
  docx: docxProcessor,
  doc: docProcessor,
};

/**
 * Analyses an upload. Unsupported extensions are rejected up front so the
 * upload route can respond with a friendly error before touching disk.
 */
export function analyzeDocument(content: DocumentContent): Promise<DocumentAnalysis> {
  const ext = extOf(content.fileName);
  const processor = processors[ext];
  if (!processor) {
    throw ApiError.unprocessable(
      `File type ".${ext}" is not supported. Upload PDF, DOC, DOCX, JPG or PNG.`
    );
  }
  return processor(content);
}

export function extOf(fileName: string): string {
  return (fileName.split(".").pop() || "").toLowerCase();
}