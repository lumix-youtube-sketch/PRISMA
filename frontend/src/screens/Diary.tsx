// Reaction diary: "ate X — reaction / none", to show a doctor. Facts only.
import { useEffect, useState } from "react";
import { api, type DiaryItem } from "../api";
import { Skeleton, Empty } from "../components";
import { FaceHappy, FaceNeutral, FaceSad, Plus } from "../icons";

const REACTION: Record<string, { label: string; Icon: (p: any) => React.ReactElement; color: string }> = {
  none:   { label: "Без реакции", Icon: FaceHappy,   color: "var(--ok)" },
  mild:   { label: "Лёгкая",      Icon: FaceNeutral, color: "var(--warn)" },
  severe: { label: "Сильная",     Icon: FaceSad,     color: "var(--bad)" },
};

export function DiaryScreen() {
  const [items, setItems] = useState<DiaryItem[] | null>(null);
  const [name, setName] = useState("");
  const [reaction, setReaction] = useState("none");
  const [note, setNote] = useState("");
  const [open, setOpen] = useState(false);

  const load = () => api.diary().then((r) => setItems(r.entries)).catch(() => setItems([]));
  useEffect(() => { void load(); }, []);

  const add = async () => {
    if (!name.trim()) return;
    await api.addDiary({ productName: name.trim(), reaction, note: note.trim() || undefined });
    setName(""); setNote(""); setReaction("none"); setOpen(false); await load();
  };

  return (
    <div className="screen screen-pad-top">
      <div className="stack" style={{ gap: 4 }}>
        <div className="eyebrow">Здоровье</div>
        <h1 className="display">Дневник реакций</h1>
        <p className="lead">Отмечайте, что ели и была ли реакция — удобно показать врачу.</p>
      </div>

      {open ? (
        <div className="card stack reveal">
          <input type="text" placeholder="Что съели" value={name} onChange={(e) => setName(e.target.value)} />
          <div className="segmented">
            {Object.entries(REACTION).map(([k, v]) => (
              <button key={k} className={reaction === k ? "on" : ""} onClick={() => setReaction(k)}>
                <span className="row-sm" style={{ justifyContent: "center", gap: 6 }}><v.Icon size={18} color={reaction === k ? v.color : "currentColor"} /> {v.label}</span>
              </button>
            ))}
          </div>
          <input type="text" placeholder="Заметка (необязательно)" value={note} onChange={(e) => setNote(e.target.value)} />
          <div className="btn-row">
            <button className="btn btn-primary btn-block" disabled={!name.trim()} onClick={add}>Добавить запись</button>
            <button className="btn btn-outline" onClick={() => setOpen(false)}>Отмена</button>
          </div>
        </div>
      ) : (
        <button className="btn btn-soft btn-block btn-lg" onClick={() => setOpen(true)}><Plus size={20} /> Новая запись</button>
      )}

      {!items && <div className="stack">{[0, 1].map((i) => <Skeleton key={i} h={70} r={20} />)}</div>}
      {items && items.length === 0 && <Empty title="Записей пока нет" hint="Добавьте первую, чтобы отслеживать реакции." />}

      {items && items.length > 0 && (
        <div className="stack">
          {items.map((it) => {
            const r = REACTION[it.reaction] ?? REACTION.none;
            const date = new Date(it.eatenAt.replace(" ", "T") + "Z");
            return (
              <div key={it.id} className="rowcard reveal">
                <div className="row">
                  <div style={{ width: 44, height: 44, borderRadius: 14, background: "var(--surface-2)", display: "inline-flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
                    <r.Icon size={24} color={r.color} />
                  </div>
                  <div className="grow">
                    <div className="h2" style={{ margin: 0 }}>{it.productName}</div>
                    {it.note && <div className="muted">{it.note}</div>}
                    <div className="tiny" style={{ marginTop: 2 }}>{r.label} · {date.toLocaleDateString("ru-RU")}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
