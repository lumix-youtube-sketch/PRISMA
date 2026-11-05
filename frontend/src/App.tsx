import { StoreProvider, useStore, type Tab } from "./store";
import { ScannerScreen } from "./screens/Scanner";
import { VerdictScreen } from "./screens/Verdict";
import { ChatScreen } from "./screens/Chat";
import { HistoryScreen } from "./screens/History";
import { DiaryScreen } from "./screens/Diary";
import { FamilyScreen } from "./screens/Family";
import { Onboarding } from "./screens/Onboarding";
import { Tariff } from "./screens/Tariff";
import { Scan, Chat, Clock, Book, Users, ArrowRight } from "./icons";
import { ArtShield } from "./illustrations";
import { isInTelegram, isLocalhost, BOT_LINK, openLink, tgPlatform, initData } from "./telegram";

const NAV: { tab: Tab; Icon: (p: any) => React.ReactElement; label: string }[] = [
  { tab: "scan", Icon: Scan, label: "Скан" },
  { tab: "chat", Icon: Chat, label: "Подбор" },
  { tab: "history", Icon: Clock, label: "История" },
  { tab: "diary", Icon: Book, label: "Дневник" },
  { tab: "family", Icon: Users, label: "Семья" },
];

function BottomNav() {
  const { tab, go, scan, paywall } = useStore();
  return (
    <nav className="nav">
      <div className="nav-inner">
        {NAV.map((n) => {
          const on = tab === n.tab && !scan && !paywall;
          return (
            <button key={n.tab} className={on ? "on" : ""} onClick={() => go(n.tab)}>
              <span className="nav-ico"><n.Icon size={22} strokeWidth={1.9} /></span>
              <span>{n.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function Screen() {
  const { tab, scan, paywall } = useStore();
  if (paywall) return <Tariff />;
  if (scan) return <VerdictScreen />;
  switch (tab) {
    case "scan": return <ScannerScreen />;
    case "chat": return <ChatScreen />;
    case "history": return <HistoryScreen />;
    case "diary": return <DiaryScreen />;
    case "family": return <FamilyScreen />;
  }
}

function TelegramGate() {
  return (
    <div className="app">
      <div className="ob screen-pad-top">
        <div className="ob-hero">
          <div className="ob-art"><ArtShield /></div>
          <div className="stack" style={{ gap: 10 }}>
            <h1 className="display">Prisma живёт <br /><span className="ac">в Telegram</span></h1>
            <p className="lead" style={{ maxWidth: 320 }}>
              Откройте приложение через нашего бота — там оно проверит состав под ваш профиль.
            </p>
          </div>
        </div>
        <div className="ob-foot">
          <button className="btn btn-primary btn-block btn-lg" onClick={() => openLink(BOT_LINK)}>
            Открыть в Telegram <ArrowRight size={19} />
          </button>
          <p className="tiny center">@prismru_bot</p>
          <p className="tiny center" style={{ opacity: .5 }}>env: {tgPlatform()} · data: {initData().length}</p>
        </div>
      </div>
    </div>
  );
}

function Shell() {
  const { loadingProfiles, profiles } = useStore();

  // Outside Telegram (opened as a plain web link) there is no initData, so the
  // API can't authenticate — guide the user to open via the bot instead.
  if (!isInTelegram() && !isLocalhost) return <TelegramGate />;

  if (loadingProfiles) {
    return <div className="app"><div className="loading-wrap" style={{ minHeight: "80vh" }}><span className="spinner" /></div></div>;
  }
  if (profiles.length === 0) {
    return <div className="app"><Onboarding /></div>;
  }
  return (
    <div className="app">
      <Screen />
      <BottomNav />
    </div>
  );
}

export default function App() {
  return <StoreProvider><Shell /></StoreProvider>;
}
