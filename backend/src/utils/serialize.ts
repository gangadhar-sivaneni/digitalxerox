import { findDocument } from "../data/repo";
import type { Order } from "../types";
import { formatBytes, rupees } from "./format";
import type { QueueView } from "../services/queue.service";

export function orderDTO(order: Order, queue?: QueueView) {
  const total = rupees(order.totalPaise);
  const documents = (order.documentIds || (order.documentId ? [order.documentId] : [])).reduce<Array<ReturnType<typeof documentMetaDTO>>>((acc, id) => {
    const meta = documentMetaDTO(id);
    if (meta) acc.push(meta);
    return acc;
  }, []);

  return {
    orderId: order.orderId,
    token: order.token,
    status: order.status,
    statusHistory: order.statusHistory,
    serviceType: order.serviceType,
    documentId: order.documentId,
    documentIds: order.documentIds,
    fileName: order.fileName,
    totalDocumentPages: order.totalDocumentPages,
    pageCount: order.pageCount,
    selectedPages: order.selectedPages,
    pageRange: order.pageRange,
    pageRangeMode: order.pageRange === "all" ? "all" : "custom",
    copies: order.copies,
    paperSize: order.paperSize,
    colorMode: order.colorMode,
    sides: order.sides,
    ratePaise: order.ratePaise,
    printingPaise: order.printingPaise,
    stationeryPaise: order.stationeryPaise,
    serviceFeePaise: order.serviceFeePaise,
    discountPaise: order.discountPaise,
    totalPaise: order.totalPaise,
    total,
    items: order.items || [],
    pricingVersion: order.pricingVersion,
    paymentStatus: order.paymentStatus,
    paymentMethod: order.paymentMethod,
    transactionId: order.transactionId,
    rejectionReason: order.rejectionReason,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    estimatedReadyAt: order.estimatedReadyAt,
    completedAt: order.completedAt,
    documentMeta: order.documentId ? documentMetaDTO(order.documentId) : undefined,
    documents,
    queue,
  };
}

function documentMetaDTO(documentId: string) {
  const doc = findDocument(documentId);
  if (!doc) return undefined;
  return {
    documentId: doc.documentId,
    fileName: doc.fileName,
    sizeBytes: doc.sizeBytes,
    sizeLabel: formatBytes(doc.sizeBytes),
    pageCount: doc.pageCount,
    mimeType: doc.mimeType,
  };
}