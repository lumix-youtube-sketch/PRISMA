// Reusable editor for a household member (used in onboarding and the Family tab).
import { useState } from "react";
import type { Profile, RestrictionId } from "@foodguard/shared";
import { RestrictionChips, Avatar } from "../components";

export function MemberForm({
  initial, submitLabel, onSubmit, onCancel,
}: {
  initial: Profile;
  submitLabel: string;
  onSubmit: (p: Profile) => void | Promise<void>;
  onCancel?: () => void;
}) {
  const [name, setName] = useState(initial.name);
  const [restrictions, setRestrictions] = useState<RestrictionId[]>(initial.restrictions);
  const [custom, setCustom] = useState(initial.custom ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!name.trim() || busy) return;
    setBusy(true); setError(null);
    try {
      await onSubmit({ ...initial, name: name.trim(), restrictions, custom: custom.trim() || undefined });
    } catch (e: any) {
      setError(
        String(e?.message ?? "").includes("401")
          ? "Не удалось сохранить: откройте Prism через Telegram-бота @prismru_bot."
          : "Не удалось сохранить. Проверьте соединение и попробуйте снова.",
      );
    } finally { setBusy(false); }
  };

  return (
    <div className="stack">
      <div className="row">
        <Avatar name={name || "?"} id={initial.id ?? name} size={52} />
        <div className="grow">
          <div className="field-label">Имя</div>
          <input type="text" placeholder="Например: Я, Марк, Бабушка"
            value={name} onChange={(e) => setName(e.target.value)} />
        </div>
      </div>

      <div>
        <div className="field-label">Ограничения и аллергии</div>
        <RestrictionChips value={restrictions} onChange={setRestrictions} />
      </div>

      <div>
        <div className="field-label">Своё ограничение (необязательно)</div>
        <input type="text" placeholder="Например: цитрусовые" value={custom} onChange={(e) => setCustom(e.target.value)} />
      </div>

      {error && (
        <div className="disclaimer" style={{ background: "var(--bad-bg)", color: "var(--bad)" }}>{error}</div>
      )}

      <div className="btn-row">
        <button className="btn btn-primary btn-block btn-lg" disabled={!name.trim() || busy} onClick={submit}>
          {submitLabel}
        </button>
        {onCancel && <button className="btn btn-outline" onClick={onCancel}>Отмена</button>}
      </div>
    </div>
  );
}
