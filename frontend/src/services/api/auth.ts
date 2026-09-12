import type { ColorMode, PaperSize, User } from "../../types";
import { apiGet, apiPatch } from "./client";

export interface MeResponse {
  user: User;
  unread: number;
}

export async function me(token: string): Promise<MeResponse> {
  return apiGet<MeResponse>("/auth/me", token);
}

export async function updateProfile(
  preferences: { paperSize?: PaperSize; colorMode?: ColorMode },
  token: string
): Promise<User> {
  const res = await apiPatch<{ user: User }>("/auth/profile", { preferences }, token);
  return res.user;
}