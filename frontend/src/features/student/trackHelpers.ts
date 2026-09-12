import type { Order } from "../../types";
import { waitTime } from "../../utils/format";

export function countdown(order: Order): string {
  return waitTime(order.queue?.etaSeconds);
}