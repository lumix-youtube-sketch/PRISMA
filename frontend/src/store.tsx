// App state. The account owner builds a household of members; every scan is
// checked against ALL members at once (no per-scan selection) — that's the whole
// point of family profiles.

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { AnalyzeResponse, Profile } from "@foodguard/shared";
import { api } from "./api";

export type Tab = "scan" | "chat" | "history" | "diary" | "family";

export interface ScanContext {
  productName?: string;
  imageUrl?: string;
  barcode?: string;
  ingredients: string[];
  analysis: AnalyzeResponse;
}

const INTRO_KEY = "fg_intro_seen_v1";
function readIntroSeen(): boolean {
  try { return localStorage.getItem(INTRO_KEY) === "1"; } catch { return false; }
}

interface Store {
  profiles: Profile[];
  loadingProfiles: boolean;
  reloadProfiles: () => Promise<void>;
  tab: Tab;
  go: (t: Tab) => void;
  scan: ScanContext | null;
  showVerdict: (s: ScanContext) => void;
  clearVerdict: () => void;
  introSeen: boolean;
  markIntroSeen: () => void;
  // Prisma+ subscription
  isPremium: boolean;
  reloadMe: () => Promise<void>;
  subscribeDemo: () => Promise<void>;
  // paywall overlay
  paywall: boolean;
  openPaywall: () => void;
  closePaywall: () => void;
}

const Ctx = createContext<Store | null>(null);
export const useStore = () => {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore outside provider");
  return s;
};

export function StoreProvider({ children }: { children: ReactNode }) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loadingProfiles, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("scan");
  const [scan, setScan] = useState<ScanContext | null>(null);
  const [introSeen, setIntroSeen] = useState(readIntroSeen());
  const [isPremium, setIsPremium] = useState(false);
  const [paywall, setPaywall] = useState(false);

  const reloadProfiles = async () => {
    setLoading(true);
    try {
      const { profiles } = await api.listProfiles();
      setProfiles(profiles);
    } finally {
      setLoading(false);
    }
  };

  const reloadMe = async () => {
    try { setIsPremium((await api.me()).isPremium); } catch { /* ignore */ }
  };

  const subscribeDemo = async () => {
    await api.subscribe();
    setIsPremium(true);
    setPaywall(false);
  };

  useEffect(() => { void reloadProfiles(); void reloadMe(); }, []);

  const markIntroSeen = () => {
    try { localStorage.setItem(INTRO_KEY, "1"); } catch { /* ignore */ }
    setIntroSeen(true);
  };

  const value: Store = {
    profiles, loadingProfiles, reloadProfiles,
    tab, go: (t) => { setScan(null); setPaywall(false); setTab(t); },
    scan,
    showVerdict: (s) => { setScan(s); setTab("scan"); },
    clearVerdict: () => setScan(null),
    introSeen, markIntroSeen,
    isPremium, reloadMe, subscribeDemo,
    paywall, openPaywall: () => setPaywall(true), closePaywall: () => setPaywall(false),
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
