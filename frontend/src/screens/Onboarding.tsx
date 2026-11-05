// First-run onboarding: 3 intro slides establishing the value + the red line,
// then creating the first household member. Looks like a real product intro.

import { useState } from "react";
import type { Profile } from "@foodguard/shared";
import { api } from "../api";
import { useStore } from "../store";
import { ArtScan, ArtFamily, ArtShield } from "../illustrations";
import { MemberForm } from "./MemberForm";
import { ArrowRight } from "../icons";

interface Slide { art: React.ReactNode; title: string; body: string }

const SLIDES: Slide[] = [
  { art: <ArtScan />, title: "Состав — за секунды",
    body: "Наведите камеру на штрихкод или сфотографируйте этикетку. Мы разберём состав и сверим с вашими ограничениями." },
  { art: <ArtFamily />, title: "Вся семья сразу",
    body: "Заполните ограничения для каждого — себя, ребёнка, близких. Любой продукт проверяется на всех одновременно." },
  { art: <ArtShield />, title: "Только факты о составе",
    body: "Мы не советуем диету и не оцениваем пользу. Показываем, что внутри и подходит ли это под ваши ограничения. Решение — за вами." },
];

export function Onboarding() {
  const { introSeen, markIntroSeen, reloadProfiles, go } = useStore();
  const [step, setStep] = useState(introSeen ? SLIDES.length : 0); // skip slides if already seen

  const createFirst = async (p: Profile) => {
    await api.createProfile(p);
    markIntroSeen();
    await reloadProfiles();
    go("scan");
  };

  if (step < SLIDES.length) {
    const s = SLIDES[step];
    const last = step === SLIDES.length - 1;
    return (
      <div className="ob screen-pad-top">
        <div className="ob-hero">
          <div className="ob-art" key={step}>{s.art}</div>
          <div className="stack" style={{ gap: 10 }}>
            <h1 className="display" key={`t${step}`}>{s.title}</h1>
            <p className="lead" style={{ maxWidth: 340 }} key={`b${step}`}>{s.body}</p>
          </div>
        </div>
        <div className="ob-foot">
          <div className="dots">
            {SLIDES.map((_, i) => <i key={i} className={i === step ? "on" : ""} />)}
          </div>
          <button className="btn btn-primary btn-block btn-lg" onClick={() => setStep(step + 1)}>
            {last ? "Начать" : "Далее"} <ArrowRight size={19} />
          </button>
          {!last && (
            <button className="btn btn-ghost btn-block" onClick={() => setStep(SLIDES.length)}>Пропустить</button>
          )}
        </div>
      </div>
    );
  }

  // Member creation step
  return (
    <div className="screen screen-pad-top">
      <div className="stack" style={{ gap: 6 }}>
        <div className="eyebrow">Шаг 1 из 1</div>
        <h1 className="title">Добавьте первого члена семьи</h1>
        <p className="lead">Отметьте ограничения — позже можно добавить ещё людей.</p>
      </div>
      <div className="card">
        <MemberForm initial={{ name: "", restrictions: [] }} submitLabel="Сохранить и продолжить" onSubmit={createFirst} />
      </div>
    </div>
  );
}
