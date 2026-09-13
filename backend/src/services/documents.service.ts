import fs from "fs";
import path from "path";

import { env } from "../config/env";
import {
  findDocument,
  getSettings,
  insertDocument,
  nextId,
  removeDocument,
} from "../data/repo";
import type { DocumentRecord, Order, User } from "../types";
import { ApiError } from "../utils/errors";
import { logger } from "../utils/logger";
import { analyzeDocument, extOf } from "./document-processing";

const ALLOWED_EXT = new Set([
  "pdf",
  "doc",
  "docx",
  "jpg",
  "jpeg",
  "png",
]);

function sanitize(name: string): string {
  return name
    .replace(/[^\w.\- ]/g, "_")
    .slice(0, 120);
}

/**
 * Store an uploaded document on disk and create its database record.
 */
export async function storeUpload(
  user: User,
  file: {
    originalname: string;
    mimetype: string;
    size: number;
    buffer: Buffer;
  }
): Promise<DocumentRecord> {
  const maxMB = Math.max(
    1,
    getSettings().maxUploadMB || 25
  );

  const ext = extOf(file.originalname);

  if (!ALLOWED_EXT.has(ext)) {
    throw ApiError.unprocessable(
      `File type ".${ext}" is not supported. Upload PDF, DOC, DOCX, JPG or PNG.`
    );
  }

  if (file.size <= 0) {
    throw ApiError.unprocessable(
      "This file is empty."
    );
  }

  if (file.size > maxMB * 1024 * 1024) {
    throw ApiError.unprocessable(
      `File is too large. Maximum is ${maxMB} MB.`
    );
  }

  const analysis = await analyzeDocument({
    buffer: file.buffer,
    mimeType: file.mimetype,
    fileName: file.originalname,
  });

  const documentId = nextId("doc");

  const safeFileName = sanitize(
    file.originalname
  );

  const storageKey = [
    user.userId,
    documentId,
    safeFileName,
  ].join("/");

  const documentDirectory = path.join(
    env.DOC_STORAGE,
    user.userId,
    documentId
  );

  const documentPath = path.join(
    env.DOC_STORAGE,
    storageKey
  );

  fs.mkdirSync(documentDirectory, {
    recursive: true,
  });

  fs.writeFileSync(
    documentPath,
    file.buffer
  );

  const record: DocumentRecord = {
    documentId,
    userId: user.userId,
    fileName: file.originalname,
    mimeType: file.mimetype,
    sizeBytes: file.size,
    pageCount: analysis.pageCount,
    storageKey,
    createdAt: new Date().toISOString(),
  };

  insertDocument(record);

  logger.info("Document uploaded", {
    documentId,
    userId: user.userId,
    fileName: record.fileName,
    storageKey: record.storageKey,
    filePath: documentPath,
    pageCount: record.pageCount,
  });

  return record;
}

/**
 * A document can be accessed by its owner, staff, or admin.
 */
export function canAccessDocument(
  doc: DocumentRecord,
  user: User
): boolean {
  return (
    doc.userId === user.userId ||
    user.role === "STAFF" ||
    user.role === "ADMIN"
  );
}

/**
 * Resolve the physical file path for a document.
 *
 * Seed documents intentionally do not have physical files.
 */
export function documentFilePath(
  doc: DocumentRecord
): string | null {
  if (!doc.storageKey) {
    return null;
  }

  if (doc.storageKey.startsWith("seed:")) {
    return null;
  }

  const filePath = path.join(
    env.DOC_STORAGE,
    doc.storageKey
  );

  if (!fs.existsSync(filePath)) {
    logger.warn("Document file not found", {
      documentId: doc.documentId,
      storageKey: doc.storageKey,
      filePath,
    });

    return null;
  }

  return filePath;
}

/**
 * Resolve a document for secure inline preview/download.
 */
export function streamDocument(
  doc: DocumentRecord,
  user: User
): {
  file: string;
  attachment: "inline" | "attachment";
} {
  const resolvedFilePath = doc.storageKey && !doc.storageKey.startsWith("seed:")
    ? path.resolve(env.DOC_STORAGE, doc.storageKey)
    : null;
  logger.info("Document preview requested", {
    documentId: doc.documentId,
    userId: user.userId,
    userRole: user.role,
    document: doc,
    storageKey: doc.storageKey,
    resolvedFilePath,
    fileExists: resolvedFilePath ? fs.existsSync(resolvedFilePath) : false,
  });

  if (!canAccessDocument(doc, user)) {
    throw ApiError.forbidden(
      "You do not have access to this document."
    );
  }

  const file = documentFilePath(doc);

  if (!file) {
    throw ApiError.notFound(
      "This document is no longer available."
    );
  }

  const inline =
    doc.mimeType === "application/pdf" ||
    doc.mimeType.startsWith("image/");

  return {
    file,
    attachment: inline
      ? "inline"
      : "attachment",
  };
}

/**
 * Document cleanup is intentionally disabled.
 *
 * Staff must be able to preview documents after an order
 * is completed, rejected, or cancelled.
 *
 * Add a separate retention cleanup job later if needed.
 */
export function purgeDocumentsForTerminalOrder(
  order: Order
): void {
  logger.info(
    "Terminal order reached; document files retained",
    {
      orderId: order.orderId,
      documentIds:
        order.documentIds ??
        (order.documentId
          ? [order.documentId]
          : []),
      status: order.status,
    }
  );

  return;
}

/**
 * Convert an internal document record into the API response.
 */
export function toDocumentDTO(
  doc: DocumentRecord
) {
  return {
    documentId: doc.documentId,
    fileName: doc.fileName,
    mimeType: doc.mimeType,
    sizeBytes: doc.sizeBytes,
    pageCount: doc.pageCount,
    createdAt: doc.createdAt,

    // Relative secure endpoint. The frontend adds the JWT
    // as the access_token query parameter.
    accessUrl: `/api/documents/${encodeURIComponent(
      doc.documentId
    )}/file`,
  };
}