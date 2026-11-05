// Chat filter: free text -> facts-only reply + product cards. Composition only.
import { useEffect, useRef, useState } from "react";
import type { CatalogProduct } from "@foodguard/shared";
import { api, isPremiumRequired, type ChatResponse } from "../api";
import { Spinner, ProductGrid, Disclaimer } from "../components";
import { Send, Chat as ChatIcon } from "../icons";
import { useStore } from "../store";
import { PaywallCard } from "./Tariff";

interface Turn { role: "me" | "bot"; text: string; products?: CatalogProduct[] }
const SUGGESTIONS = ["сыр без лактозы", "печенье без глютена", "йогурт без молока", "хлеб без пшеницы"];

export function ChatScreen() {
  const { isPremium, openPaywall } = useStore();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [turns, loading]);

  const send = async (message: string) => {
    const msg = message.trim();
    if (!msg || loading) return;
    setInput("");
    setTurns((t) => [...t, { role: "me", text: msg }]);
    setLoading(true);
    try {
      const res: ChatResponse = await api.chat(msg);
      setTurns((t) => [...t, { role: "bot", text: res.reply, products: res.products }]);
    } catch (e) {
      if (isPremiumRequired(e)) { openPaywall(); return; }
      setTurns((t) => [...t, { role: "bot", text: "Не удалось обработать запрос. Попробуйте переформулировать." }]);
    } finally { setLoading(false); }
  };

  return (
    <div className="screen screen-pad-top">
      <div className="stack" style={{ gap: 4 }}>
        <div className="eyebrow">Подбор</div>
        <h1 className="display">Найти по составу</h1>
      </div>

      {!isPremium ? (
        <PaywallCard title="Чат-подбор по составу" hint="Опишите, что ищете — Prisma+ подберёт товары без нужных ингредиентов с фото, ценой и составом." />
      ) : (<>

      {turns.length === 0 ? (
        <div className="card stack reveal" style={{ alignItems: "center", textAlign: "center", padding: 24 }}>
          <div style={{ width: 56, height: 56, borderRadius: 18, background: "var(--brand-50)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
            <ChatIcon size={26} color="var(--brand-600)" />
          </div>
          <p className="lead">Опишите, что ищете — подберём товары без нужных ингредиентов.</p>
          <div className="chips" style={{ justifyContent: "center" }}>
            {SUGGESTIONS.map((s) => <span key={s} className="chip" onClick={() => send(s)}>{s}</span>)}
          </div>
        </div>
      ) : (
        <div className="stack">
          {turns.map((t, i) => (
            <div key={i} className="reveal">
              {t.role === "me"
                ? <div className="bubble me">{t.text}</div>
                : <div className="stack-sm"><div className="bubble bot">{t.text}</div>{t.products && t.products.length > 0 && <ProductGrid products={t.products} />}</div>}
            </div>
          ))}
          {loading && <Spinner label="Подбираю…" />}
          <div ref={endRef} />
        </div>
      )}

      <div className="composer">
        <input className="grow" type="text" placeholder="сыр без лактозы…" value={input}
          onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void send(input); }} />
        <button className="send-btn" onClick={() => void send(input)} disabled={!input.trim() || loading}><Send size={20} /></button>
      </div>

      <Disclaimer text="Фильтр по составу, а не совет по питанию. Это не медицинская рекомендация." />
      </>)}
    </div>
  );
}
