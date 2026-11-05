// Verdict screen. A household overview (everyone at a glance) + per-member detail
// cards with highlighted triggers, then safe substitutions and a diary shortcut.

import { useEffect, useMemo, useState } from "react";
import type { CatalogProduct, ProfileResult, RestrictionId, Verdict } from "@foodguard/shared";
import { api } from "../api";
import { useStore } from "../store";
import { VerdictPill, Disclaimer, ProductRibbon, Skeleton, Avatar, StatusDot } from "../components";
import { PaywallCard } from "./Tariff";
import { RESTRICTION_ICON, VERDICT_ICON, ArrowLeft, FaceHappy, FaceNeutral, FaceSad, Sparkles } from "../icons";
import { VERDICT_META, type Tone } from "../constants";

const CATEGORIES = ["сыр", "молоко", "йогурт", "печенье", "хлеб"];
const guessCategory = (name?: string) =>
  CATEGORIES.find((c) => (name ?? "").toLowerCase().includes(c.slice(0, 4))) ?? "";

const WORST: Record<Verdict, number> = { safe: 0, caution: 1, unsafe: 2 };
const toneOf = (v: Verdict): Tone => VERDICT_META[v].tone;

function Hero({ results }: { results: ProfileResult[] }) {
  const worst = results.reduce<Verdict>((a, r) => (WORST[r.verdict] > WORST[a] ? r.verdict : a), "safe");
  const tone = toneOf(worst);
  const Icon = VERDICT_ICON[worst];
  const bad = results.filter((r) => r.verdict === "unsafe").length;
  const warn = results.filter((r) => r.verdict === "caution").length;
  const total = results.length;

  const headline =
    worst === "safe" ? "Подходит всем" :
    worst === "unsafe" ? `Нельзя${total > 1 ? ` для ${bad} из ${total}` : ""}` :
    `Осторожно${total > 1 ? ` для ${warn} из ${total}` : ""}`;
  const color = tone === "ok" ? "var(--ok-ring)" : tone === "warn" ? "var(--warn-ring)" : "var(--bad-ring)";
  const bg = tone === "ok" ? "var(--ok-bg)" : tone === "warn" ? "var(--warn-bg)" : "var(--bad-bg)";

  return (
    <div className="card reveal" style={{ textAlign: "center", padding: "26px 18px" }}>
      <div style={{ width: 76, height: 76, borderRadius: "50%", background: bg, display: "inline-flex",
        alignItems: "center", justifyContent: "center", animation: "pop .4s var(--ease-out)" }}>
        <Icon size={40} color={color} strokeWidth={2} />
      </div>
      <h1 className="title" style={{ marginTop: 14, color }}>{headline}</h1>
    </div>
  );
}

function MemberStrip({ results, profileId }: { results: ProfileResult[]; profileId: (name: string) => number | undefined }) {
  if (results.length < 2) return null;
  return (
    <div className="members-strip reveal reveal-1">
      {results.map((r) => (
        <div className="member-chip" key={r.profileName}>
          <div className="av-wrap">
            <Avatar name={r.profileName} id={profileId(r.profileName)} size={52} />
            <StatusDot tone={toneOf(r.verdict)} />
          </div>
          <span className="nm">{r.profileName}</span>
        </div>
      ))}
    </div>
  );
}

function ResultCard({ r, id, i }: { r: ProfileResult; id?: number; i: number }) {
  const tone = toneOf(r.verdict);
  return (
    <div className={`vcard ${tone} reveal`} style={{ animationDelay: `${0.12 + i * 0.06}s` }}>
      <div className="accent" />
      <div className="stack" style={{ padding: "16px 16px 16px 20px" }}>
        <div className="row">
          <Avatar name={r.profileName} id={id} size={40} />
          <div className="grow h2" style={{ margin: 0 }}>{r.profileName}</div>
          <VerdictPill verdict={r.verdict} />
        </div>
        <p style={{ margin: 0, fontSize: 14.5, color: "var(--ink-2)" }}>{r.explanation}</p>
        {r.hits.length > 0 && (
          <div>
            {r.hits.map((h, k) => {
              const rid = guessRestrictionId(h.matchedRestriction);
              const Icon = rid ? RESTRICTION_ICON[rid] : null;
              return (
                <div className="hit" key={k}>
                  <span className="dot" style={{ color: "var(--bad)" }}>{Icon ? <Icon size={19} /> : <span style={{ width: 8, height: 8, borderRadius: 4, background: "var(--bad)", display: "inline-block", marginTop: 2 }} />}</span>
                  <div className="grow">
                    <div className="ing">{h.ingredient}</div>
                    <div className="meta">{h.matchedRestriction} — {h.reason}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// Map a restriction label back to an id for the glyph (best-effort).
function guessRestrictionId(label: string): RestrictionId | null {
  const l = label.toLowerCase();
  if (l.includes("глютен")) return "gluten";
  if (l.includes("молок") || l.includes("лактоз")) return "milk";
  if (l.includes("арахис")) return "peanut";
  if (l.includes("орех")) return "nuts";
  if (l.includes("яй")) return "egg";
  if (l.includes("соя") || l.includes("соев")) return "soy";
  if (l.includes("рыб")) return "fish";
  if (l.includes("морепр") || l.includes("креветк")) return "seafood";
  if (l.includes("мёд") || l.includes("мед")) return "honey";
  if (l.includes("сахар")) return "sugar";
  return null;
}

function Alternatives({ productName, category, exclude }: { productName?: string; category: string; exclude: RestrictionId[] }) {
  // Auto-pick the best "similar products" query: the product's own name, else a
  // guessed category, else a generic search — so the ribbon fills immediately.
  const meaningfulName = productName && productName !== "Продукт" ? productName : "";
  const initialQuery = category || meaningfulName || "продукты";
  const [active, setActive] = useState<string>(category || (meaningfulName ? "similar" : "продукты"));
  const [products, setProducts] = useState<CatalogProduct[] | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async (query: string, key: string) => {
    setActive(key); setLoading(true);
    try { setProducts((await api.alternatives({ category: query, excludeAllergens: exclude })).products); }
    finally { setLoading(false); }
  };

  useEffect(() => { void load(initialQuery, category || (meaningfulName ? "similar" : "продукты")); }, []);

  return (
    <div className="card stack reveal" style={{ animationDelay: ".3s" }}>
      <div className="row-sm"><Sparkles size={20} color="var(--brand-600)" /><div className="h2">Похожее без аллергенов</div></div>
      <p className="muted" style={{ margin: 0 }}>Те же товары, но без того, что не подходит семье.</p>

      {loading && (
        <div className="ribbon">
          {[0, 1, 2].map((i) => (
            <div key={i} className="ribbon-card" style={{ flex: "none" }}>
              <Skeleton h={118} r={18} />
              <Skeleton h={13} w="80%" style={{ marginTop: 8 }} />
              <Skeleton h={15} w="45%" style={{ marginTop: 6 }} />
            </div>
          ))}
        </div>
      )}
      {!loading && products && products.length > 0 && <ProductRibbon products={products} />}
      {!loading && products && products.length === 0 && <p className="tiny">Подходящих замен в каталоге не нашлось.</p>}

      <div className="chips" style={{ marginTop: 2 }}>
        {meaningfulName && (
          <span className={`chip ${active === "similar" ? "on" : ""}`} onClick={() => load(meaningfulName, "similar")}>Похожие</span>
        )}
        {CATEGORIES.map((c) => (
          <span key={c} className={`chip ${active === c ? "on" : ""}`} onClick={() => load(c, c)}>{c}</span>
        ))}
      </div>
    </div>
  );
}

function DiaryQuickAdd({ productName }: { productName: string }) {
  const [done, setDone] = useState(false);
  const save = async (reaction: string) => { await api.addDiary({ productName: productName || "Продукт", reaction }); setDone(true); };
  if (done) return <div className="disclaimer" style={{ justifyContent: "center", color: "var(--ok-2)", background: "var(--ok-bg)" }}>Записано в дневник</div>;
  const opts = [
    { k: "none", Icon: FaceHappy, label: "Без реакции", color: "var(--ok)" },
    { k: "mild", Icon: FaceNeutral, label: "Лёгкая", color: "var(--warn)" },
    { k: "severe", Icon: FaceSad, label: "Сильная", color: "var(--bad)" },
  ];
  return (
    <div className="card flat stack">
      <div className="field-label" style={{ margin: 0 }}>Была реакция после продукта?</div>
      <div className="btn-row">
        {opts.map((o) => (
          <button key={o.k} className="btn btn-block" style={{ flexDirection: "column", gap: 6, padding: "14px 8px", background: "var(--surface)" }} onClick={() => save(o.k)}>
            <o.Icon size={26} color={o.color} />
            <span style={{ fontSize: 12.5, fontWeight: 600 }}>{o.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function VerdictScreen() {
  const { scan, profiles, clearVerdict, isPremium } = useStore();
  const [showIngredients, setShowIngredients] = useState(false);
  if (!scan) return null;
  const { analysis } = scan;
  const idByName = (name: string) => profiles.find((p) => p.name === name)?.id;

  const exclude = useMemo<RestrictionId[]>(() => {
    const unsafe = new Set(analysis.results.filter((r) => r.verdict !== "safe").map((r) => r.profileName));
    const ids = new Set<RestrictionId>();
    for (const p of profiles) if (unsafe.has(p.name)) p.restrictions.forEach((r) => ids.add(r));
    return [...ids];
  }, [analysis, profiles]);

  const anyUnsafe = analysis.results.some((r) => r.verdict !== "safe");

  return (
    <div className="screen screen-pad-top">
      <button className="btn btn-icon" style={{ alignSelf: "flex-start" }} onClick={clearVerdict}><ArrowLeft size={20} /></button>

      <div className="card flush reveal">
        {scan.imageUrl && <img src={scan.imageUrl} alt="" style={{ width: "100%", maxHeight: 200, objectFit: "cover", display: "block" }} />}
        <div className="stack" style={{ padding: 16 }}>
          <h2 className="title" style={{ margin: 0 }}>{scan.productName ?? "Продукт"}</h2>
          {scan.ingredients.length > 0 && (
            <>
              <button className="btn btn-ghost" style={{ alignSelf: "flex-start", padding: 0 }} onClick={() => setShowIngredients((v) => !v)}>
                {showIngredients ? "Скрыть состав" : `Показать состав (${scan.ingredients.length})`}
              </button>
              {showIngredients && <p className="muted" style={{ margin: 0 }}>{scan.ingredients.join(", ")}</p>}
            </>
          )}
        </div>
      </div>

      <Hero results={analysis.results} />
      <MemberStrip results={analysis.results} profileId={idByName} />

      {analysis.results.map((r, i) => <ResultCard key={r.profileName} r={r} id={idByName(r.profileName)} i={i} />)}

      {anyUnsafe && (isPremium
        ? <Alternatives productName={scan.productName} category={guessCategory(scan.productName)} exclude={exclude} />
        : <PaywallCard title="Безопасные замены" hint="Prisma+ подберёт похожие товары без ваших аллергенов — с фото, ценой и составом." />)}

      <DiaryQuickAdd productName={scan.productName ?? ""} />
      <Disclaimer text={analysis.disclaimer} />
    </div>
  );
}
