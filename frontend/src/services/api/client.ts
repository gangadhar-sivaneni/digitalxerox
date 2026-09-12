import type { ApiEnvelope, ApiErrorShape } from "../../types";
import { clearSession } from "../storage/session";

const BASE = "/api";

export class ApiClientError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(message: string, status: number, code: string, details?: unknown) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

async function parseEnvelope<T>(res: Response): Promise<T> {
  if (res.status === 204) return undefined as T;
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    body = undefined;
  }
  if (!res.ok) {
    if (res.status === 401) clearSession();
    const errorBody = body as { error?: ApiErrorShape } | undefined;
    const shape = errorBody?.error;
    throw new ApiClientError(
      shape?.message || "Something went wrong. Please try again.",
      res.status,
      shape?.code || "REQUEST_FAILED",
      shape?.details
    );
  }
  return (body as ApiEnvelope<T>).data;
}

function headers(token?: string): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (token) h.Authorization = "Bearer " + token;
  return h;
}

export async function apiGet<T>(path: string, token?: string): Promise<T> {
  const res = await fetch(BASE + path, { headers: headers(token) });
  return parseEnvelope<T>(res);
}

export async function apiPost<T>(
  path: string,
  body: unknown,
  token?: string
): Promise<T> {
  const res = await fetch(BASE + path, {
    method: "POST",
    headers: headers(token),
    body: JSON.stringify(body),
  });
  return parseEnvelope<T>(res);
}

export async function apiPatch<T>(
  path: string,
  body: unknown,
  token?: string
): Promise<T> {
  const res = await fetch(BASE + path, {
    method: "PATCH",
    headers: headers(token),
    body: JSON.stringify(body),
  });
  return parseEnvelope<T>(res);
}

export async function apiDelete<T>(path: string, token?: string): Promise<T> {
  const res = await fetch(BASE + path, { method: "DELETE", headers: headers(token) });
  return parseEnvelope<T>(res);
}

export async function apiUpload<T>(
  path: string,
  formData: FormData,
  token: string,
  onProgress?: (pct: number) => void
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", BASE + path);
    xhr.setRequestHeader("Authorization", "Bearer " + token);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () => {
      try {
        const parsed = JSON.parse(xhr.responseText) as ApiEnvelope<T>;
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(parsed.data);
        } else {
          const shape = (parsed as { error?: ApiErrorShape }).error;
          throw new ApiClientError(
            shape?.message || "Upload failed.",
            xhr.status,
            shape?.code || "UPLOAD_FAILED",
            shape?.details
          );
        }
      } catch (err) {
        if (err instanceof ApiClientError) reject(err);
        else reject(new ApiClientError("Upload failed.", xhr.status, "UPLOAD_FAILED"));
      }
    };
    xhr.onerror = () => reject(new ApiClientError("Network error during upload.", 0, "NETWORK"));
    xhr.send(formData);
  });
}