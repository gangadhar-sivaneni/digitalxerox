/** Queue IDs remain canonical in storage, but users see the compact Q-number format. */
export function displayToken(token: string): string {
  const match = (token || "").match(/^(?:XR-|Q)(\d+)$/i);
  return match ? "Q" + match[1] : token;
}

export function displayQueueText(text: string): string {
  return text.replace(/(?:XR-|Q)(\d+)/gi, (_match, number: string) => "Q" + number);
}

export function rupees(paise: number, opts: { decimals?: boolean } = {}): string {
  const value = paise / 100;
  if (opts.decimals !== false && value % 1 !== 0) {
    return "₹" + value.toFixed(2);
  }
  return "₹" + value.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

export function clockFrom(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
}

export function orderedDateLabel(iso: string): string {
  return "placed " + clockFrom(iso);
}

export function minutesAgo(iso: string): string {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return "just now";
  if (mins === 1) return "1 min";
  if (mins < 60) return mins + " min";
  const h = Math.floor(mins / 60);
  return h + " h";
}

export function relativeMinLabel(iso: string): string {
  return minutesAgo(iso);
}

export function waitTime(seconds: number | null | undefined): string {
  if (seconds == null || seconds < 0) return "—";
  if (seconds < 60) return `${seconds} sec`;
  if (seconds < 3600) return `${Math.ceil(seconds / 60)} min`;
  return `${(seconds / 3600).toFixed(seconds % 3600 === 0 ? 0 : 1)} hr`;
}

export function greetingForName(name: string | undefined): string {
  const first = (name || "there").split(" ")[0];
  const h = new Date().getHours();
  if (h < 12) return "Good morning, " + first + ".";
  if (h < 17) return "Good afternoon, " + first + ".";
  return "Good evening, " + first + ".";
}

export function fullSpec(o: {
  pageCount?: number | null;
  copies?: number;
  paperSize?: string;
  colorMode?: string;
  sides?: string;
}): string {
  const parts: string[] = [];
  if (o.pageCount != null) parts.push(o.pageCount + " pages");
  if (o.copies && o.copies > 1) parts.push(o.copies + " copies");
  if (o.paperSize) parts.push(o.paperSize);
  if (o.colorMode) parts.push(o.colorMode === "color" ? "Colour" : "B&W");
  if (o.sides) parts.push(o.sides === "double" ? "Double" : "Single");
  return parts.join(" · ");
}

export function isActive(status: string): boolean {
  return status === "RECEIVED" || status === "PROCESSING" || status === "READY";
}