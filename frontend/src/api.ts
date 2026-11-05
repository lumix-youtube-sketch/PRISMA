// Typed API client. Every request carries Telegram initData in the Authorization
// header so the backend can resolve the user. In local dev (DEV_AUTH_BYPASS) the
// header is ignored by the backend.

import type {
  AnalyzeResponse, CatalogProduct, Profile, RestrictionId,
} from "@foodguard/shared";
import { initData } from "./telegram";

const BASE = "/api";

/** Error carrying the HTTP status so callers can detect 402 (premium_required). */
export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export const isPremiumRequired = (e: unknown) => e instanceof ApiError && e.status === 402;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `tma ${initData()}`,
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new ApiError(res.status, `${res.status} ${res.statusText}${body ? `: ${body}` : ""}`);
  }
  return res.json() as Promise<T>;
}

export interface ProductLookup {
  found: boolean; barcode: string; productName?: string;
  imageUrl?: string; ingredients: string[]; source: string;
}
export interface VisionResult { found: boolean; productName?: string; ingredients: string[] }
export interface ChatResponse {
  query: { category: string; excludeAllergens: RestrictionId[]; excludeCustom?: string; reply: string };
  products: CatalogProduct[]; reply: string; disclaimer: string;
}
export interface HistoryItem {
  id: number; source: string; barcode?: string; productName?: string;
  imageUrl?: string; ingredients: string[]; results: AnalyzeResponse["results"]; createdAt: string;
}
export interface DiaryItem {
  id: number; profileId?: number; productName: string; reaction: string; note?: string; eatenAt: string;
}

export interface MeResponse {
  userId: number;
  isPremium: boolean;
  subscription: { plan: string; status: string; expiresAt: string | null } | null;
}

export const api = {
  // account & subscription
  me: () => request<MeResponse>("/me"),
  subscribe: () => request<{ isPremium: boolean }>("/subscribe", { method: "POST", body: "{}" }),
  unsubscribe: () => request<{ isPremium: boolean }>("/unsubscribe", { method: "POST", body: "{}" }),

  // profiles
  listProfiles: () => request<{ profiles: Profile[] }>("/profiles"),
  createProfile: (p: Profile) => request<{ profile: Profile }>("/profiles", { method: "POST", body: JSON.stringify(p) }),
  updateProfile: (id: number, p: Profile) =>
    request<{ profile: Profile }>(`/profiles/${id}`, { method: "PUT", body: JSON.stringify(p) }),
  deleteProfile: (id: number) => request<{ deleted: boolean }>(`/profiles/${id}`, { method: "DELETE" }),

  // products & analysis
  product: (barcode: string) => request<ProductLookup>(`/product/${encodeURIComponent(barcode)}`),
  analyze: (body: {
    ingredients: string[]; profiles: Profile[];
    barcode?: string; productName?: string; imageUrl?: string; save?: boolean;
  }) => request<AnalyzeResponse>("/analyze", { method: "POST", body: JSON.stringify(body) }),
  scanPhoto: (imageBase64: string, mediaType?: string) =>
    request<VisionResult>("/scan-photo", { method: "POST", body: JSON.stringify({ imageBase64, mediaType }) }),

  // catalog
  alternatives: (body: { category: string; excludeAllergens?: RestrictionId[]; excludeCustom?: string; limit?: number }) =>
    request<{ products: CatalogProduct[]; disclaimer: string }>("/alternatives", { method: "POST", body: JSON.stringify(body) }),
  chat: (message: string) => request<ChatResponse>("/chat", { method: "POST", body: JSON.stringify({ message }) }),

  // history & diary
  history: () => request<{ scans: HistoryItem[] }>("/history"),
  diary: () => request<{ entries: DiaryItem[] }>("/diary"),
  addDiary: (body: { profileId?: number; productName: string; reaction: string; note?: string }) =>
    request<{ id: number }>("/diary", { method: "POST", body: JSON.stringify(body) }),

  // crowdsource
  crowd: (body: { barcode?: string; productName?: string; ingredients: string[] }) =>
    request<{ id: number }>("/crowd", { method: "POST", body: JSON.stringify(body) }),
};
