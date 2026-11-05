// Shared premium UI pieces — all iconography is inline SVG (no emoji).
import type { ReactNode } from "react";
import type { CatalogProduct, RestrictionId, Verdict } from "@foodguard/shared";
import { RESTRICTIONS, VERDICT_META, avatarGradient, initials, type Tone } from "./constants";
import { RESTRICTION_ICON, VERDICT_ICON, Info, CheckCircle, Shield } from "./icons";
import { ArtEmpty } from "./illustrations";
import { openLink } from "./telegram";

/* ---- Avatar -------------------------------------------------------------- */
export function Avatar({ name, id, size = 44 }: { name: string; id?: number | string; size?: number }) {
  return (
    <span className="avatar" style={{ ["--sz" as string]: `${size}px`, background: avatarGradient(id ?? name) }}>
      {initials(name)}
    </span>
  );
}

/* ---- Verdict pill -------------------------------------------------------- */
export function VerdictPill({ verdict }: { verdict: Verdict }) {
  const m = VERDICT_META[verdict];
  const Icon = VERDICT_ICON[verdict];
  return <span className={`pill ${m.tone}`}><Icon size={15} /> {m.label}</span>;
}

/* status dot used on avatars in the member strip */
export function StatusDot({ tone }: { tone: Tone }) {
  const color = tone === "ok" ? "var(--ok-ring)" : tone === "warn" ? "var(--warn-ring)" : "var(--bad-ring)";
  const Icon = tone === "ok" ? VERDICT_ICON.safe : tone === "warn" ? VERDICT_ICON.caution : VERDICT_ICON.unsafe;
  return (
    <span className="status-dot" style={{ background: color }}>
      <Icon size={11} stroke="#fff" strokeWidth={2.6} />
    </span>
  );
}

/* ---- Restriction chips --------------------------------------------------- */
export function RestrictionChips({
  value, onChange,
}: { value: RestrictionId[]; onChange: (next: RestrictionId[]) => void }) {
  const toggle = (id: RestrictionId) =>
    onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  return (
    <div className="alg-grid">
      {RESTRICTIONS.map((r) => {
        const Icon = RESTRICTION_ICON[r.id];
        const on = value.includes(r.id);
        return (
          <button type="button" key={r.id} className={`alg-tile ${on ? "on" : ""}`} onClick={() => toggle(r.id)}>
            <span className="ic"><Icon size={19} /></span>
            <span className="lb">{r.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ---- Product cards ------------------------------------------------------- */
export function ProductCard({ p, ribbon }: { p: CatalogProduct; ribbon?: boolean }) {
  const open = () => p.url && openLink(p.url);
  return (
    <div className={`product${ribbon ? " ribbon-card" : ""}`} onClick={open} style={p.url ? { cursor: "pointer" } : undefined}>
      <div className="ph">
        <img src={p.imageUrl} alt={p.name} loading="lazy" />
        <span className="safe-tag"><CheckCircle size={12} /> Подходит</span>
      </div>
      <div className="body">
        <div className="name grow">{p.name}</div>
        <div className="price">{p.priceRub} ₽</div>
        {!ribbon && <div className="ings">{p.ingredients.join(", ")}</div>}
      </div>
    </div>
  );
}

export function ProductGrid({ products }: { products: CatalogProduct[] }) {
  if (!products.length)
    return <Empty title="Ничего не нашлось" hint="Под эти ограничения в каталоге нет товаров." />;
  return <div className="grid">{products.map((p) => <ProductCard key={p.id} p={p} />)}</div>;
}

/** Horizontal scrolling ribbon of safe alternatives. */
export function ProductRibbon({ products }: { products: CatalogProduct[] }) {
  return (
    <div className="ribbon">
      {products.map((p) => <ProductCard key={p.id} p={p} ribbon />)}
    </div>
  );
}

/* ---- Disclaimer ---------------------------------------------------------- */
export function Disclaimer({ text }: { text: string }) {
  return <div className="disclaimer"><Info size={16} /><span>{text}</span></div>;
}

/* ---- Loading / skeleton -------------------------------------------------- */
export function Spinner({ label }: { label?: string }) {
  return (
    <div className="loading-wrap">
      <span className="spinner" />
      {label && <span className="muted">{label}</span>}
    </div>
  );
}

export function Skeleton({ h = 16, w = "100%", r = 12, style }: { h?: number; w?: number | string; r?: number; style?: React.CSSProperties }) {
  return <div className="sk" style={{ height: h, width: w, borderRadius: r, ...style }} />;
}

/* ---- Empty state --------------------------------------------------------- */
export function Empty({ title, hint, children }: { title: string; hint?: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <div className="art"><ArtEmpty /></div>
      <div className="h2">{title}</div>
      {hint && <p className="lead" style={{ maxWidth: 280 }}>{hint}</p>}
      {children}
    </div>
  );
}

/* ---- Trust banner (red line) -------------------------------------------- */
export function TrustNote({ text }: { text: string }) {
  return (
    <div className="disclaimer" style={{ background: "var(--brand-50)", color: "var(--brand-700)" }}>
      <Shield size={16} /><span>{text}</span>
    </div>
  );
}
