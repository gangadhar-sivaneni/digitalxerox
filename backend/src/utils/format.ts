/** Currency is stored internally as integer paise to avoid float drift. */

export function rupees(paise: number): number {
  return Math.round((paise || 0) * 100) / 10000;
}

export function formatRupees(paise: number): string {
  return "₹" + (paise / 100).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

export function formatRupeesFixed(paise: number): string {
  return "₹" + (paise / 100).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatClock(iso: string | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateGroup(iso: string): string {
  return new Date(iso)
    .toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    .toUpperCase();
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export function timeAgo(iso: string): string {
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 45) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return m + " min ago";
  const h = Math.floor(m / 60);
  if (h < 24) return h + " hr ago";
  const d = Math.floor(h / 24);
  return d + " days ago";
}

export function todayKey(offsetMs = 0): string {
  const d = new Date(Date.now() + offsetMs);
  return d.toISOString().slice(0, 10);
}

export function isToday(iso: string): boolean {
  return new Date(iso).toISOString().slice(0, 10) === todayKey();
}

/** Queue IDs remain canonical in storage, but users see the compact Q-number format. */
export function displayToken(token: string): string {
  const match = (token || "").match(/^(?:XR-|Q)(\d+)$/i);
  return match ? "Q" + match[1] : token;
}

export function normalizeToken(input: string): string {
  return (input || "").trim().replace(/—/g, "-").toUpperCase();
}