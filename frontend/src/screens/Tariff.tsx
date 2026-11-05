// Single tariff screen: free vs Prisma+ comparison + demo checkout.
// Shown as an overlay when a premium feature is tapped, or from the Family tab.
import { useState } from "react";
import { useStore } from "../store";
import { Crown, Check, Lock, Close, Sparkles } from "../icons";

const FREE = [
  "Сканирование по штрихкоду",
  "Безлимит профилей и семья",
  "Вердикт можно / осторожно / нельзя",
  "Скрытые аллергены по словарю",
  "История сканов и дневник реакций",
];
const PLUS = [
  "Фото этикетки — ИИ распознаёт состав",
  "Углублённый ИИ-анализ неочевидных ингредиентов",
  "Чат-ассистент по составу",
  "Витрина замен с фото, ценой и составом",
];

export function Tariff() {
  const { isPremium, subscribeDemo, closePaywall } = useStore();
  const [busy, setBusy] = useState(false);

  const buy = async () => {
    setBusy(true);
    try { await subscribeDemo(); } finally { setBusy(false); }
  };

  return (
    <div className="screen screen-pad-top">
      <div className="row">
        <button className="btn btn-icon" onClick={closePaywall}><Close size={20} /></button>
        <div className="grow" />
      </div>

      <div className="stack" style={{ gap: 6, textAlign: "center", alignItems: "center" }}>
        <div style={{ width: 60, height: 60, borderRadius: 18, background: "var(--green-soft)", display: "grid", placeItems: "center" }}>
          <Crown size={30} color="var(--green)" />
        </div>
        <h1 className="display">Prisma<span className="ac">+</span></h1>
        <p className="lead" style={{ maxWidth: 320 }}>
          Базовая безопасность — бесплатно и без лимитов. Prisma+ добавляет функции с ИИ и каталогом товаров.
        </p>
      </div>

      {/* Free */}
      <div className="card stack">
        <div className="between">
          <div className="h2">Free</div>
          <span className="pill ok">Всё без лимитов</span>
        </div>
        {FREE.map((f) => (
          <div className="row-sm" key={f}><Check size={18} color="var(--green)" /><span style={{ fontSize: 14.5 }}>{f}</span></div>
        ))}
      </div>

      {/* Prisma+ */}
      <div className="card stack" style={{ border: "1.5px solid var(--green)", boxShadow: "var(--shadow)" }}>
        <div className="between">
          <div className="row-sm"><Crown size={18} color="var(--green)" /><div className="h2">Prisma+</div></div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontWeight: 800, fontSize: 18 }}>199 ₽<span style={{ fontWeight: 500, fontSize: 13, color: "var(--ink-2)" }}>/мес</span></div>
            <div className="tiny">или 1490 ₽/год</div>
          </div>
        </div>
        {PLUS.map((f) => (
          <div className="row-sm" key={f}><Sparkles size={17} color="var(--green)" /><span style={{ fontSize: 14.5 }}>{f}</span></div>
        ))}
      </div>

      {isPremium ? (
        <div className="disclaimer" style={{ background: "var(--green-soft)", color: "var(--green-dark)", justifyContent: "center" }}>
          <Crown size={16} /> У вас активен Prisma+
        </div>
      ) : (
        <button className="btn btn-primary btn-block btn-lg" disabled={busy} onClick={buy}>
          <Lock size={18} /> Оформить Prisma+ (демо)
        </button>
      )}

      <p className="tiny center">Демо-оплата: подписка включается сразу, без списания. Реальный биллинг подключим позже.</p>
      <div className="disclaimer">Это не медицинская рекомендация. При сомнениях — обратитесь к врачу.</div>
    </div>
  );
}

/** Small inline paywall card used where a premium feature is blocked. */
export function PaywallCard({ title, hint }: { title: string; hint: string }) {
  const { openPaywall } = useStore();
  return (
    <div className="card stack" style={{ alignItems: "center", textAlign: "center" }}>
      <div style={{ width: 52, height: 52, borderRadius: 16, background: "var(--green-soft)", display: "grid", placeItems: "center" }}>
        <Lock size={24} color="var(--green)" />
      </div>
      <div className="h2">{title}</div>
      <p className="lead" style={{ maxWidth: 300, margin: 0 }}>{hint}</p>
      <button className="btn btn-primary btn-block" onClick={openPaywall}><Crown size={18} /> Открыть в Prisma+</button>
    </div>
  );
}
