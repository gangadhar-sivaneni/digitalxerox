import type { Notification } from "../../types";
import { apiGet, apiPost } from "./client";

export async function listNotifications(token: string): Promise<Notification[]> {
  return apiGet<Notification[]>("/notifications", token);
}

export async function markNotificationRead(notificationId: string, token: string): Promise<void> {
  await apiPost<{ ok: boolean }>("/notifications/" + notificationId + "/read", {}, token);
}

export async function markAllNotificationsRead(token: string): Promise<void> {
  await apiPost<{ ok: boolean }>("/notifications/read-all", {}, token);
}