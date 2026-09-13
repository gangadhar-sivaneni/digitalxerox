import { apiUpload } from "./client";

export interface UploadedMeta {
  documentId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  pageCount: number | null;
  createdAt: string;

  // Secure backend endpoint used for staff document preview/download.
  accessUrl: string;
}

/** POST multipart upload with XHR progress events into /api/documents. */
export async function uploadDocument(
  file: File,
  token: string,
  onProgress?: (pct: number) => void
): Promise<UploadedMeta> {
  const fd = new FormData();
  fd.append("file", file);

  return apiUpload<UploadedMeta>(
    "/documents/",
    fd,
    token,
    onProgress
  );
}

/**
 * Secure temporary document access. The file endpoint never exposes a public
 * URL — the reader's JWT rides along as a query token, so the same link is
 * meaningless once the session expires.
 */
export function documentDownloadUrl(
  accessUrl: string,
  token: string
): string {
  const configuredApiUrl = import.meta.env.VITE_API_URL?.trim().replace(/\/+$/, "");
  const backendOrigin = configuredApiUrl?.replace(/\/api$/, "") || window.location.origin;
  const relativePath = accessUrl.startsWith("/")
    ? accessUrl
    : `/${accessUrl}`;
  const url = /^https?:\/\//i.test(accessUrl)
    ? new URL(accessUrl)
    : new URL(relativePath, backendOrigin);

  url.searchParams.set("access_token", token);
  return url.toString();
}