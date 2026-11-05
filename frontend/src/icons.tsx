// Inline SVG icon system. 24×24 grid, stroke = currentColor, no emoji anywhere.
// Line icons for UI; the restriction glyphs double as the app's infographic.
import type { SVGProps } from "react";
import type { RestrictionId, Verdict } from "@foodguard/shared";

type P = SVGProps<SVGSVGElement> & { size?: number };
const base = (size = 24): SVGProps<SVGSVGElement> => ({
  width: size, height: size, viewBox: "0 0 24 24", fill: "none",
  stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round",
});
const S = ({ size, children, ...p }: P & { children: React.ReactNode }) => (
  <svg {...base(size)} {...p}>{children}</svg>
);

/* ---- UI ------------------------------------------------------------------ */
export const Scan = (p: P) => <S {...p}><path d="M4 7V5a1 1 0 0 1 1-1h2M17 4h2a1 1 0 0 1 1 1v2M20 17v2a1 1 0 0 1-1 1h-2M7 20H5a1 1 0 0 1-1-1v-2"/><path d="M4 12h16"/></S>;
export const Barcode = (p: P) => <S {...p}><path d="M4 6v12M8 6v12M12 6v9M16 6v12M20 6v12"/></S>;
export const Label = (p: P) => <S {...p}><path d="M13.4 3H6a3 3 0 0 0-3 3v7.4a2 2 0 0 0 .6 1.4l7.6 7.6a2 2 0 0 0 2.8 0l6.6-6.6a2 2 0 0 0 0-2.8L15.4 3.6A2 2 0 0 0 13.4 3z"/><circle cx="8.5" cy="8.5" r="1.3"/></S>;
export const PencilLine = (p: P) => <S {...p}><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></S>;
export const Chat = (p: P) => <S {...p}><path d="M21 11.5a8.5 8.5 0 0 1-12.6 7.4L3 21l2.1-5.4A8.5 8.5 0 1 1 21 11.5z"/></S>;
export const Clock = (p: P) => <S {...p}><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></S>;
export const Book = (p: P) => <S {...p}><path d="M5 4h11a2 2 0 0 1 2 2v14H7a2 2 0 0 1-2-2V4z"/><path d="M5 17.5A2 2 0 0 1 7 16h11"/></S>;
export const User = (p: P) => <S {...p}><circle cx="12" cy="8" r="3.6"/><path d="M5 20a7 7 0 0 1 14 0"/></S>;
export const Users = (p: P) => <S {...p}><circle cx="9" cy="8" r="3.2"/><path d="M3 19a6 6 0 0 1 12 0"/><path d="M16 5.3a3.2 3.2 0 0 1 0 5.9M17 19a6 6 0 0 0-2-4.6"/></S>;
export const Plus = (p: P) => <S {...p}><path d="M12 5v14M5 12h14"/></S>;
export const Trash = (p: P) => <S {...p}><path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13"/></S>;
export const ChevronRight = (p: P) => <S {...p}><path d="M9 6l6 6-6 6"/></S>;
export const ArrowLeft = (p: P) => <S {...p}><path d="M19 12H5M11 18l-6-6 6-6"/></S>;
export const ArrowRight = (p: P) => <S {...p}><path d="M5 12h14M13 6l6 6-6 6"/></S>;
export const Close = (p: P) => <S {...p}><path d="M6 6l12 12M18 6L6 18"/></S>;
export const Info = (p: P) => <S {...p}><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></S>;
export const Send = (p: P) => <S {...p}><path d="M4 12l16-8-6 16-3.5-6.5L4 12z"/></S>;
export const Camera = (p: P) => <S {...p}><path d="M3 8a2 2 0 0 1 2-2h2l1.2-1.6A1 1 0 0 1 11 4h2a1 1 0 0 1 .8.4L15 6h4a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8z"/><circle cx="12" cy="12.5" r="3.4"/></S>;
export const Sparkles = (p: P) => <S {...p}><path d="M12 3l1.6 4.2L18 9l-4.4 1.8L12 15l-1.6-4.2L6 9l4.4-1.8L12 3z"/><path d="M18 14l.8 2.2L21 17l-2.2.8L18 20l-.8-2.2L15 17l2.2-.8L18 14z"/></S>;
export const Shield = (p: P) => <S {...p}><path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3z"/></S>;
export const Lock = (p: P) => <S {...p}><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/><path d="M12 15v2"/></S>;
export const Crown = (p: P) => <S {...p}><path d="M3 7l4 4 5-6 5 6 4-4-2 12H5L3 7z"/><path d="M5 20h14"/></S>;
export const Check = (p: P) => <S {...p}><path d="M5 12.5l4 4 10-10"/></S>;

/* ---- verdict icons (filled badges) -------------------------------------- */
export const CheckCircle = (p: P) => <S {...p}><circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.5 2.5L16 9"/></S>;
export const WarnTri = (p: P) => <S {...p}><path d="M12 4l9 15.5H3L12 4z"/><path d="M12 10v4M12 17h.01"/></S>;
export const NoEntry = (p: P) => <S {...p}><circle cx="12" cy="12" r="9"/><path d="M7.5 7.5l9 9"/></S>;

/* ---- reaction faces ------------------------------------------------------ */
export const FaceHappy = (p: P) => <S {...p}><circle cx="12" cy="12" r="9"/><path d="M8.5 14.5a4.5 4.5 0 0 0 7 0"/><path d="M9 9.5h.01M15 9.5h.01"/></S>;
export const FaceNeutral = (p: P) => <S {...p}><circle cx="12" cy="12" r="9"/><path d="M8.5 15h7"/><path d="M9 9.5h.01M15 9.5h.01"/></S>;
export const FaceSad = (p: P) => <S {...p}><circle cx="12" cy="12" r="9"/><path d="M8.5 15.5a4.5 4.5 0 0 1 7 0"/><path d="M9 9.5h.01M15 9.5h.01"/></S>;

/* ---- restriction glyphs (the infographic) ------------------------------- */
const Gluten = (p: P) => <S {...p}><path d="M12 21V8"/><path d="M12 8c0-2 1.5-3 3-3 0 2-1 3-3 3zM12 8c0-2-1.5-3-3-3 0 2 1 3 3 3z"/><path d="M12 13c0-2 1.5-3 3-3 0 2-1 3-3 3zM12 13c0-2-1.5-3-3-3 0 2 1 3 3 3z"/><path d="M12 18c0-2 1.5-3 3-3 0 2-1 3-3 3zM12 18c0-2-1.5-3-3-3 0 2 1 3 3 3z"/></S>;
const Milk = (p: P) => <S {...p}><path d="M9 3h6v3l1.5 3v10a2 2 0 0 1-2 2H9.5a2 2 0 0 1-2-2V9L9 6V3z"/><path d="M7.5 12h9"/></S>;
const Nut = (p: P) => <S {...p}><path d="M12 3c4 0 7 3 7 7 0 5-4 9-7 11-3-2-7-6-7-11 0-4 3-7 7-7z"/><path d="M12 7v8M9 10l3 2 3-2"/></S>;
const Peanut = (p: P) => <S {...p}><path d="M12 3c2 0 3.2 1.4 3.2 3 0 1.1-.5 1.8-.5 2.8 0 1 .8 1.6.8 3.2 0 1.6-1.2 3-3.5 3s-3.5-1.4-3.5-3c0-1.6.8-2.2.8-3.2 0-1-.5-1.7-.5-2.8 0-1.6 1.2-3 3.2-3z"/><path d="M12 15.5c-2.3 0-3.5 1.4-3.5 3C8.5 20.4 10 22 12 22s3.5-1.6 3.5-3.5c0-1.6-1.2-3-3.5-3z"/></S>;
const Egg = (p: P) => <S {...p}><path d="M12 3c3.3 0 6 4.5 6 9a6 6 0 0 1-12 0c0-4.5 2.7-9 6-9z"/></S>;
const Soy = (p: P) => <S {...p}><path d="M5 6c3-1 7 1 9.5 3.5S18 16 17 19"/><path d="M5 6c-1 3 1 7 3.5 9.5S15 20 18 19"/><circle cx="8.5" cy="9.5" r="1" fill="currentColor" stroke="none"/><circle cx="11.5" cy="12.5" r="1" fill="currentColor" stroke="none"/><circle cx="14.5" cy="15.5" r="1" fill="currentColor" stroke="none"/></S>;
const Fish = (p: P) => <S {...p}><path d="M3 12c3-4 8-5 12-3 2 1 4 3 6 3-2 0-4 2-6 3-4 2-9 1-12-3z"/><path d="M18 12h.01"/><path d="M3 12c-.5-1-.5-2 0-3M3 12c-.5 1-.5 2 0 3"/></S>;
const Shell = (p: P) => <S {...p}><path d="M12 19 L4.6 9.6 A9 9 0 0 1 19.4 9.6 Z"/><path d="M12 19 L5.4 10.4M12 19 L8.6 8.3M12 19 L12 7.2M12 19 L15.4 8.3M12 19 L18.6 10.4"/></S>;
const Honey = (p: P) => <S {...p}><path d="M7 4h10M8 4l-1 4v10a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V8l-1-4"/><path d="M12 11v5"/><path d="M12 11c1.2 1.6 1.2 3.4 0 5-1.2-1.6-1.2-3.4 0-5z" fill="currentColor" stroke="none" opacity=".3"/></S>;
const Sugar = (p: P) => <S {...p}><path d="M5 9l4-3 10 3-4 3L5 9z"/><path d="M5 9v6l10 3v-6M15 12v6l4-3V9"/></S>;

export const RESTRICTION_ICON: Record<RestrictionId, (p: P) => React.ReactElement> = {
  gluten: Gluten, milk: Milk, nuts: Nut, peanut: Peanut, egg: Egg,
  soy: Soy, fish: Fish, seafood: Shell, honey: Honey, sugar: Sugar,
};

export const VERDICT_ICON: Record<Verdict, (p: P) => React.ReactElement> = {
  safe: CheckCircle, caution: WarnTri, unsafe: NoEntry,
};
