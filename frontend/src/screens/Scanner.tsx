// Scan hub. No per-scan member selection — every scan is checked against the
// whole household at once. Three paths: barcode, label photo, manual.

import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader, type IScannerControls } from "@zxing/browser";
import { DecodeHintType, BarcodeFormat } from "@zxing/library";
import { api } from "../api";
import { useStore } from "../store";
import { Avatar } from "../components";
import { Barcode, Camera, PencilLine, ChevronRight, Close, Users, Sparkles, Lock } from "../icons";

/* who the household is — a compact reassurance that everyone is covered */
function HouseholdBar() {
  const { profiles, go } = useStore();
  return (
    <button className="card flat row" style={{ width: "100%", textAlign: "left", cursor: "pointer", padding: 14 }}
      onClick={() => go("family")}>
      <div className="row-sm" style={{ marginLeft: 0 }}>
        {profiles.slice(0, 4).map((p, i) => (
          <span key={p.id} style={{ marginLeft: i ? -12 : 0, border: "2px solid var(--surface)", borderRadius: "50%" }}>
            <Avatar name={p.name} id={p.id} size={34} />
          </span>
        ))}
      </div>
      <div className="grow">
        <div style={{ fontWeight: 650, fontSize: 14 }}>Проверяем всю семью</div>
        <div className="tiny">{profiles.length} {plural(profiles.length)}</div>
      </div>
      <ChevronRight size={18} color="var(--ink-3)" />
    </button>
  );
}
function plural(n: number) {
  const mod10 = n % 10, mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "человек";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return "человека";
  return "человек";
}

function Tile({ icon, title, sub, primary, locked, onClick }: {
  icon: React.ReactNode; title: string; sub: string; primary?: boolean; locked?: boolean; onClick: () => void;
}) {
  return (
    <button className={`tile ${primary ? "primary" : ""}`} onClick={onClick}>
      <span className="tile-ico">{icon}</span>
      <span className="grow">
        <span className="tile-ttl">{title}</span>
        <span className="tile-sub">{sub}</span>
      </span>
      {locked ? <span className="plus-badge"><Lock size={13} /> Prisma+</span> : <ChevronRight size={20} className="chev" />}
    </button>
  );
}

function humanCamError(e: any): string {
  const name = e?.name || "";
  if (name === "NotAllowedError" || name === "SecurityError")
    return "Доступ к камере запрещён. Разрешите камеру для этого сайта в настройках браузера и попробуйте снова.";
  if (name === "NotFoundError" || name === "OverconstrainedError")
    return "Камера не найдена. Сфотографируйте этикетку или введите состав вручную.";
  if (name === "NotReadableError")
    return "Камера занята другим приложением. Закройте его и попробуйте снова.";
  return "Не удалось открыть камеру. Сфотографируйте этикетку или введите состав вручную.";
}

function BarcodeScanner({ onDetected, onClose, onFallback }: {
  onDetected: (code: string) => void; onClose: () => void; onFallback: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);
  const [status, setStatus] = useState<"starting" | "scanning" | "error">("starting");
  const [errMsg, setErrMsg] = useState("");
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);

  useEffect(() => {
    // Camera needs a secure context (https) — except on localhost.
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(location.hostname);
    if (!window.isSecureContext && !local) {
      setStatus("error");
      setErrMsg("Камера работает только по защищённому соединению (https). Откройте приложение по https-ссылке.");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("error");
      setErrMsg("Этот браузер не поддерживает доступ к камере.");
      return;
    }

    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E,
    ]);
    const reader = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 180 });
    let stopped = false;

    reader
      .decodeFromConstraints(
        { video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } } },
        videoRef.current!,
        (result, _err, controls) => {
          if (stopped) return;
          if (!controlsRef.current) {
            controlsRef.current = controls;
            setStatus("scanning");
            const stream = videoRef.current?.srcObject as MediaStream | null;
            const track = stream?.getVideoTracks?.()[0] ?? null;
            trackRef.current = track;
            const caps = (track?.getCapabilities?.() ?? {}) as MediaTrackCapabilities & { torch?: boolean };
            if (caps.torch) setHasTorch(true);
          }
          if (result) { stopped = true; controls.stop(); onDetected(result.getText()); }
        },
      )
      .catch((e) => { setStatus("error"); setErrMsg(humanCamError(e)); });

    return () => { stopped = true; controlsRef.current?.stop(); };
  }, [onDetected]);

  const toggleTorch = async () => {
    const track = trackRef.current;
    if (!track) return;
    try {
      await track.applyConstraints({ advanced: [{ torch: !torchOn }] as any });
      setTorchOn((v) => !v);
    } catch { /* torch unsupported */ }
  };

  if (status === "error") {
    return (
      <div className="card stack reveal">
        <div className="row-sm"><Close size={20} color="var(--bad)" /><div className="h2">Камера недоступна</div></div>
        <p className="lead">{errMsg}</p>
        <button className="btn btn-primary btn-block" onClick={onFallback}><Camera size={18} /> Сфотографировать этикетку</button>
        <button className="btn btn-outline btn-block" onClick={onClose}>Закрыть</button>
      </div>
    );
  }

  return (
    <div className="stack reveal">
      <div className="scanner">
        <video ref={videoRef} muted playsInline autoPlay />
        <div className="reticle"><i className="c1" /><i className="c2" /></div>
        <div className="laser" />
        {status === "starting" && (
          <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
            <span className="spinner" style={{ borderTopColor: "#fff", borderColor: "rgba(255,255,255,.35)" }} />
          </div>
        )}
      </div>
      <p className="tiny center">Наведите рамку на штрихкод — распознаем автоматически.</p>
      <div className="btn-row">
        {hasTorch && (
          <button className={`btn ${torchOn ? "btn-soft" : "btn-outline"}`} onClick={toggleTorch}>
            {torchOn ? "Выключить фонарик" : "Фонарик"}
          </button>
        )}
        <button className="btn btn-outline btn-block" onClick={onClose}><Close size={18} /> Закрыть</button>
      </div>
    </div>
  );
}

type Mode = "idle" | "barcode" | "manual";

export function ScannerScreen() {
  const { profiles, showVerdict, isPremium, openPaywall } = useStore();
  const photoAction = () => { if (isPremium) fileRef.current?.click(); else openPaywall(); };
  const [mode, setMode] = useState<Mode>("idle");
  const [busy, setBusy] = useState<string | null>(null);
  const [manual, setManual] = useState("");
  const [notFound, setNotFound] = useState<{ barcode?: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const runAnalyze = async (args: { ingredients: string[]; productName?: string; imageUrl?: string; barcode?: string }) => {
    setBusy("Сверяю состав со всей семьёй…");
    try {
      const analysis = await api.analyze({ ...args, profiles });
      showVerdict({ ...args, ingredients: args.ingredients, analysis });
    } finally { setBusy(null); }
  };

  const onBarcode = async (code: string) => {
    setMode("idle"); setBusy("Ищу продукт по штрихкоду…");
    try {
      const product = await api.product(code);
      if (!product.found || product.ingredients.length === 0) { setNotFound({ barcode: code }); return; }
      await runAnalyze({ ingredients: product.ingredients, productName: product.productName, imageUrl: product.imageUrl, barcode: code });
    } finally { setBusy(null); }
  };

  const onPhoto = async (file: File) => {
    setBusy("Распознаю состав на фото…");
    try {
      const dataUrl = await new Promise<string>((res, rej) => {
        const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = rej; r.readAsDataURL(file);
      });
      const vision = await api.scanPhoto(dataUrl, (file.type || "image/jpeg") as any);
      if (!vision.found || !vision.ingredients.length) { setNotFound({}); return; }
      await runAnalyze({ ingredients: vision.ingredients, productName: vision.productName });
    } finally { setBusy(null); }
  };

  if (busy) return (
    <div className="screen"><div className="loading-wrap reveal">
      <span className="spinner" /><span className="lead">{busy}</span>
    </div></div>
  );

  return (
    <div className="screen screen-pad-top">
      <div className="stack" style={{ gap: 4 }}>
        <div className="eyebrow">Prism</div>
        <h1 className="display reveal reveal-1">Что сегодня проверяем?</h1>
      </div>

      <div className="reveal reveal-2"><HouseholdBar /></div>

      <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden
        onChange={(e) => { const f = e.target.files?.[0]; if (f) void onPhoto(f); e.target.value = ""; }} />

      {mode === "barcode" && (
        <BarcodeScanner
          onDetected={onBarcode}
          onClose={() => setMode("idle")}
          onFallback={() => { setMode("idle"); fileRef.current?.click(); }}
        />
      )}

      {mode === "idle" && (
        <div className="tiles reveal reveal-3">
          <Tile primary icon={<Barcode size={24} />} title="Сканировать штрихкод"
            sub="Наведите камеру на код продукта" onClick={() => setMode("barcode")} />
          <Tile icon={<Camera size={22} />} title="Сфотографировать этикетку"
            sub="Если штрихкода нет в базе" locked={!isPremium} onClick={photoAction} />
          <Tile icon={<PencilLine size={22} />} title="Ввести состав вручную"
            sub="Скопируйте состав с упаковки" onClick={() => setMode("manual")} />
        </div>
      )}

      {mode === "manual" && (
        <div className="card stack reveal">
          <div className="field-label">Состав продукта</div>
          <textarea rows={4} placeholder="молоко, сахар, какао-масло, лецитин…"
            value={manual} onChange={(e) => setManual(e.target.value)} />
          <div className="btn-row">
            <button className="btn btn-primary btn-block" disabled={!manual.trim()}
              onClick={() => { void runAnalyze({ ingredients: manual.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean) }); setManual(""); setMode("idle"); }}>
              <Sparkles size={18} /> Проверить
            </button>
            <button className="btn btn-outline" onClick={() => { setManual(""); setMode("idle"); }}>Отмена</button>
          </div>
        </div>
      )}

      {notFound && (
        <div className="card stack reveal">
          <div className="row-sm"><Users size={20} color="var(--green)" /><div className="h2">Продукта нет в базе</div></div>
          <p className="lead">Сфотографируйте состав или добавьте его вручную — и поможете другим пользователям.</p>
          <button className="btn btn-soft btn-block" onClick={() => { setNotFound(null); photoAction(); }}>
            <Camera size={18} /> Сфотографировать этикетку {!isPremium && <Lock size={15} />}
          </button>
          <CrowdAdd barcode={notFound.barcode} onDone={() => setNotFound(null)} />
        </div>
      )}
    </div>
  );
}

function CrowdAdd({ barcode, onDone }: { barcode?: string; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  if (!open) return <button className="btn btn-outline btn-block" onClick={() => setOpen(true)}><PencilLine size={18} /> Добавить состав вручную</button>;
  return (
    <div className="stack">
      <input type="text" placeholder="Название продукта" value={name} onChange={(e) => setName(e.target.value)} />
      <textarea rows={3} placeholder="Состав через запятую" value={text} onChange={(e) => setText(e.target.value)} />
      <button className="btn btn-primary btn-block" disabled={!text.trim()}
        onClick={async () => {
          await api.crowd({ barcode, productName: name.trim() || undefined, ingredients: text.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean) });
          onDone();
        }}>
        Отправить
      </button>
    </div>
  );
}
