import { apiGet } from "./client";

export interface LiveQueueSummary {
  activeCount: number;
  nowServing?: string;
  etaMinutes: number;
  avgProcessingMinutes: number;
  updatedAt: string;
}

export function getLiveQueue(): Promise<LiveQueueSummary> {
  return apiGet<LiveQueueSummary>("/queue/live");
}