import fs from "fs";
import { Router } from "express";
import multer from "multer";
import { findDocument, listDocuments } from "../data/repo";
import { requireAuth, requireRole } from "../middleware/auth";
import { ApiError, asyncHandler } from "../utils/errors";
import {
  storeUpload,
  streamDocument,
  toDocumentDTO,
} from "../services/documents.service";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 26 * 1024 * 1024, files: 1 },
});

router.post(
  "/",
  requireAuth,
  requireRole("STUDENT"),
  upload.single("file"),
  asyncHandler(async (req, res) => {
    if (!req.file) throw ApiError.unprocessable("Attach a file to upload.");
    const doc = await storeUpload(req.user!, req.file);
    res.status(201).json({ data: toDocumentDTO(doc) });
  })
);

router.get("/", requireAuth, asyncHandler(async (req, res) => {
  const isStaff = req.user!.role === "STAFF" || req.user!.role === "ADMIN";
  const docs = isStaff
    ? listDocuments()
    : listDocuments(req.user!.userId);
  res.json({ data: docs.map(toDocumentDTO) });
}));

router.get("/:id/meta", requireAuth, asyncHandler(async (req, res) => {
  const doc = findDocument(req.params.id);
  if (!doc) throw ApiError.notFound("Document not found.");
  const allowed =
    doc.userId === req.user!.userId ||
    req.user!.role === "STAFF" ||
    req.user!.role === "ADMIN";
  if (!allowed) throw ApiError.forbidden("You do not have access to this document.");
  res.json({ data: toDocumentDTO(doc) });
}));

router.get("/:id/file", requireAuth, asyncHandler(async (req, res) => {
  const doc = findDocument(req.params.id);
  if (!doc) throw ApiError.notFound("Document not found.");
  const { file, attachment } = streamDocument(doc, req.user!);
  res.setHeader("Content-Type", doc.mimeType || "application/octet-stream");
  res.setHeader("Content-Disposition", `${attachment}; filename="${encodeURIComponent(doc.fileName)}"`);
  res.setHeader("X-Content-Type-Options", "nosniff");
  const read = fs.createReadStream(file);
  read.on("error", () => {
    if (!res.headersSent) res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to read document." } });
  });
  read.pipe(res);
}));

export default router;