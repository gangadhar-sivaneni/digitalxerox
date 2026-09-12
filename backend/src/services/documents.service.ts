import fs from "fs";
import path from "path";
import { env } from "../config/env";
import { findDocument, getSettings, insertDocument, listOrders, nextId, removeDocument } from "../data/repo";
import type { DocumentRecord, Order, User } from "../types";
import { ApiError } from "../utils/errors";
import { logger } from "../utils/logger";
import { analyzeDocument, extOf } from "./document-processing";

const ALLOWED_EXT = new Set(["pdf", "doc", "docx", "jpg", "jpeg", "png"]);

function sanitize(name: string): string {
  return name.replace(/[^\w.\- ]/g, "_").slice(0, 120);
}

export async function storeUpload(
  user: User,
  file: { originalname: string; mimetype: string; size: number; buffer: Buffer }
): Promise<DocumentRecord> {
  const maxMB = Math.max(1, getSettings().maxUploadMB || 25);
  const ext = extOf(file.originalname);
  if (!ALLOWED_EXT.has(ext)) {
    throw ApiError.unprocessable(
      `File type ".${ext}" is not supported. Upload PDF, DOC, DOCX, JPG or PNG.`
    );
  }
  if (file.size <= 0) throw ApiError.unprocessable("This file is empty.");
  if (file.size > maxMB * 1024 * 1024) {
    throw ApiError.unprocessable(`File is too large. Maximum is ${maxMB} MB.`);
  }

  const analysis = await analyzeDocument({
    buffer: file.buffer,
    mimeType: file.mimetype,
    fileName: file.originalname,
  });

  const documentId = nextId("doc");
  const storageKey = `${user.userId}/${documentId}/${sanitize(file.originalname)}`;
  const dir = path.join(env.DOC_STORAGE, user.userId, documentId);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(env.DOC_STORAGE, storageKey), file.buffer);

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
    pageCount: record.pageCount,
  });
  return record;
}

export function canAccessDocument(doc: DocumentRecord, user: User): boolean {
  return doc.userId === user.userId || user.role === "STAFF" || user.role === "ADMIN";
}

export function documentFilePath(doc: DocumentRecord): string | null {
  if (doc.storageKey.startsWith("seed:")) return null;
  const file = path.join(env.DOC_STORAGE, doc.storageKey);
  return fs.existsSync(file) ? file : null;
}

export function streamDocument(doc: DocumentRecord, user: User) {
  if (!canAccessDocument(doc, user)) {
    throw ApiError.forbidden("You do not have access to this document.");
  }
  const file = documentFilePath(doc);
  if (!file) {
    throw ApiError.notFound("This document is no longer available.");
  }
  const inline = doc.mimeType === "application/pdf" || doc.mimeType.startsWith("image/");
  return { file, attachment: inline ? "inline" : "attachment" };
}

const TERMINAL_STATUSES = new Set<Order["status"]>(["COMPLETED", "REJECTED", "CANCELLED"]);

/** Deletes an order's uploaded files (and their records) once the order reaches a
 *  terminal state (completed or rejected). A document is left intact as long as
 *  another in-flight order still references it — the same upload can back several
 *  print jobs, and deleting it would break the remaining job's preview. */
export function purgeDocumentsForTerminalOrder(order: Order): void {
  const ids = order.documentIds?.length ? order.documentIds : order.documentId ? [order.documentId] : [];
  for (const documentId of ids) {
    const doc = findDocument(documentId);
    if (!doc) continue;
    // Seeded demo documents have no physical file and are shared — never purge them.
    if (doc.storageKey.startsWith("seed:")) continue;
    const stillNeeded = listOrders().some(
      (other) =>
        other.orderId !== order.orderId &&
        !TERMINAL_STATUSES.has(other.status) &&
        (other.documentIds?.includes(documentId) || other.documentId === documentId)
    );
    if (stillNeeded) continue;
    const file = documentFilePath(doc);
    if (file) {
      fs.rmSync(file, { force: true });
      try {
        fs.rmdirSync(path.dirname(file));
      } catch {
        // Directory may contain other files or already be gone — leaving it is fine.
      }
    }
    removeDocument(documentId);
    logger.info("Document files purged after terminal order", {
      documentId,
      orderId: order.orderId,
      fileName: doc.fileName,
    });
  }
}

export function toDocumentDTO(doc: DocumentRecord) {
  return {
    documentId: doc.documentId,
    fileName: doc.fileName,
    mimeType: doc.mimeType,
    sizeBytes: doc.sizeBytes,
    pageCount: doc.pageCount,
    createdAt: doc.createdAt,
  };
}