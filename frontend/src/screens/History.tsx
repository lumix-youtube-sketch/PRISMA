// Scan history with the worst verdict per scan.
import { useEffect, useState } from "react";
import type { Verdict } from "@foodguard/shared";
import { api, type HistoryItem } from "../api";
import { Skeleton, VerdictPill, Empty } from "../components";
import { Barcode, Camera, Chat } from "../icons";

const WORST: Record<Verdict, number> = { safe: 0, caution: 1, unsafe: 2 };
function worstVerdict(results: HistoryItem["results"]): Verdict | null {
  if (!results?.length) return null;
  return results.reduce<Verdict>((a, r) => (WORST[r.verdict] > WORST[a] ? r.verdict : a), "safe");
}
const SRC: Record<string, { label: string; Icon: (p: any) => React.ReactElement }> = {
  barcode: { label: "Штрихкод", Icon: Barcode },
  photo:   { label: "Фото", Icon: Camera },
  chat:    { label: "Подбор", Icon: Chat },
};

export function HistoryScreen() {
  const [items, setItems] = useState<HistoryItem[] | null>(null);
  useEffect(() => { api.history().then((r) => setItems(r.scans)).catch(() => setItems([])); }, []);

  return (
    <div className="screen screen-pad-top">
      <div className="stack" style={{ gap: 4 }}>
        <div className="eyebrow">Журнал</div>
        <h1 className="display">История</h1>
      </div>

      {!items && <div className="stack">{[0, 1, 2].map((i) => <Skeleton key={i} h={92} r={20} />)}</div>}
      {items && items.length === 0 && <Empty title="Пока пусто" hint="Отсканированные продукты появятся здесь." />}

      {items && items.length > 0 && (
        <div className="stack">
          {items.map((it) => {
            const v = worstVerdict(it.results);
            const src = SRC[it.source] ?? SRC.photo;
            const date = new Date(it.createdAt.replace(" ", "T") + "Z");
            return (
              <div key={it.id} className="rowcard reveal">
                <div className="between">
                  <div className="grow">
                    <div className="h2" style={{ margin: 0 }}>{it.productName || "Продукт"}</div>
                    <div className="tiny" style={{ marginTop: 2 }}>
                      {date.toLocaleDateString("ru-RU")} · {date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                  <span className="tag row-sm" style={{ gap: 5 }}><src.Icon size={13} /> {src.label}</span>
                </div>
                {v && <div style={{ marginTop: 10 }}><VerdictPill verdict={v} /></div>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
