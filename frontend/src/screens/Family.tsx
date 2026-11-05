// Household management: the account owner adds/edits members. Everyone here is
// checked on every scan.
import { useState } from "react";
import type { Profile } from "@foodguard/shared";
import { api } from "../api";
import { useStore } from "../store";
import { Avatar } from "../components";
import { MemberForm } from "./MemberForm";
import { RESTRICTION_ICON, PencilLine, Trash, Plus, Crown, ChevronRight } from "../icons";
import { RESTRICTION_LABEL } from "../constants";

function PlusRow() {
  const { isPremium, openPaywall } = useStore();
  return (
    <button className="card row" style={{ width: "100%", textAlign: "left", cursor: "pointer", padding: 16 }} onClick={openPaywall}>
      <span style={{ width: 42, height: 42, borderRadius: 13, background: "var(--green-soft)", display: "grid", placeItems: "center", flex: "none" }}>
        <Crown size={22} color="var(--green)" />
      </span>
      <div className="grow">
        <div style={{ fontWeight: 700 }}>{isPremium ? "Prisma+ активен" : "Prisma+"}</div>
        <div className="tiny">{isPremium ? "Все функции с ИИ открыты" : "Фото этикетки, чат и замены — 199 ₽/мес"}</div>
      </div>
      <ChevronRight size={18} color="var(--ink-3)" />
    </button>
  );
}

function MemberRow({ p, onEdit, onRemove }: { p: Profile; onEdit: () => void; onRemove: () => void }) {
  return (
    <div className="rowcard reveal">
      <div className="row">
        <Avatar name={p.name} id={p.id} size={46} />
        <div className="grow">
          <div className="h2" style={{ margin: 0 }}>{p.name}</div>
          {p.restrictions.length || p.custom ? (
            <div className="row-sm wrap" style={{ gap: 6, marginTop: 6 }}>
              {p.restrictions.map((r) => {
                const Icon = RESTRICTION_ICON[r];
                return (
                  <span key={r} className="row-sm" style={{ gap: 4, background: "var(--surface-2)", padding: "4px 9px", borderRadius: "var(--r-pill)", fontSize: 12, fontWeight: 600, color: "var(--ink-2)" }}>
                    <Icon size={14} /> {RESTRICTION_LABEL[r]}
                  </span>
                );
              })}
              {p.custom && <span style={{ background: "var(--surface-2)", padding: "4px 9px", borderRadius: "var(--r-pill)", fontSize: 12, fontWeight: 600, color: "var(--ink-2)" }}>{p.custom}</span>}
            </div>
          ) : <div className="tiny" style={{ marginTop: 4 }}>Без ограничений</div>}
        </div>
      </div>
      <div className="btn-row" style={{ marginTop: 12 }}>
        <button className="btn btn-outline btn-block" onClick={onEdit}><PencilLine size={16} /> Изменить</button>
        <button className="btn btn-danger" onClick={onRemove}><Trash size={16} /></button>
      </div>
    </div>
  );
}

export function FamilyScreen() {
  const { profiles, reloadProfiles } = useStore();
  const [editing, setEditing] = useState<number | "new" | null>(null);

  const create = async (p: Profile) => { await api.createProfile(p); setEditing(null); await reloadProfiles(); };
  const update = async (id: number, p: Profile) => { await api.updateProfile(id, p); setEditing(null); await reloadProfiles(); };
  const remove = async (id: number) => { await api.deleteProfile(id); await reloadProfiles(); };

  const editingProfile = typeof editing === "number" ? profiles.find((p) => p.id === editing) : null;

  return (
    <div className="screen screen-pad-top">
      <div className="stack" style={{ gap: 4 }}>
        <div className="eyebrow">Семья</div>
        <h1 className="display">Моя семья</h1>
        <p className="lead">Каждый продукт проверяется на всех сразу.</p>
      </div>

      {editing === null && <PlusRow />}

      {editing === "new" && (
        <div className="card stack reveal">
          <div className="row-sm"><Plus size={20} color="var(--brand-600)" /><div className="h2">Новый член семьи</div></div>
          <MemberForm initial={{ name: "", restrictions: [] }} submitLabel="Добавить" onSubmit={create} onCancel={() => setEditing(null)} />
        </div>
      )}

      {editingProfile && (
        <div className="card stack reveal">
          <div className="h2">Изменить профиль</div>
          <MemberForm initial={editingProfile} submitLabel="Сохранить" onSubmit={(p) => update(editingProfile.id!, p)} onCancel={() => setEditing(null)} />
        </div>
      )}

      {editing === null && (
        <>
          {profiles.map((p) => (
            <MemberRow key={p.id} p={p} onEdit={() => setEditing(p.id!)} onRemove={() => remove(p.id!)} />
          ))}
          <button className="btn btn-soft btn-block btn-lg" onClick={() => setEditing("new")}>
            <Plus size={20} /> Добавить члена семьи
          </button>
        </>
      )}
    </div>
  );
}
