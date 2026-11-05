// Labels + presentation metadata (no emoji — icons live in icons.tsx).
import type { RestrictionId, Verdict } from "@foodguard/shared";

export interface RestrictionMeta { id: RestrictionId; label: string }

export const RESTRICTIONS: RestrictionMeta[] = [
  { id: "gluten",  label: "Глютен" },
  { id: "milk",    label: "Молоко/лактоза" },
  { id: "nuts",    label: "Орехи" },
  { id: "peanut",  label: "Арахис" },
  { id: "egg",     label: "Яйца" },
  { id: "soy",     label: "Соя" },
  { id: "fish",    label: "Рыба" },
  { id: "seafood", label: "Морепродукты" },
  { id: "honey",   label: "Мёд" },
  { id: "sugar",   label: "Сахар" },
];

export const RESTRICTION_LABEL: Record<RestrictionId, string> =
  Object.fromEntries(RESTRICTIONS.map((r) => [r.id, r.label])) as Record<RestrictionId, string>;

export type Tone = "ok" | "warn" | "bad";
export const VERDICT_META: Record<Verdict, { label: string; tone: Tone }> = {
  safe:    { label: "Можно",    tone: "ok" },
  caution: { label: "Осторожно", tone: "warn" },
  unsafe:  { label: "Нельзя",   tone: "bad" },
};

// Avatar gradient palette — muted pastels, deterministic per member.
const AVATAR_GRADIENTS = [
  "linear-gradient(140deg,#b7c7a8,#8ca98a)", // sage
  "linear-gradient(140deg,#e3b5a4,#c98b7a)", // clay
  "linear-gradient(140deg,#c3b6d8,#a593c2)", // lilac
  "linear-gradient(140deg,#a9c4cf,#7fa3b3)", // dusty blue
  "linear-gradient(140deg,#e6c79a,#cfa872)", // sand/honey
  "linear-gradient(140deg,#d7a9b4,#bd8495)", // rose
  "linear-gradient(140deg,#acc9b9,#7fae95)", // mint
  "linear-gradient(140deg,#d9b8a0,#c0977a)", // caramel
];
export function avatarGradient(key: string | number): string {
  const s = String(key);
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return AVATAR_GRADIENTS[h % AVATAR_GRADIENTS.length];
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}
