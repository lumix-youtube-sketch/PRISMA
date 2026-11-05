// Brand SVG illustrations for onboarding + empty states. Geometric, on-brand,
// theme-aware (neutrals via currentColor-ish tokens, accent via gradient).
import { useId } from "react";

const W = 240;

function Frame({ children, size = W }: { children: React.ReactNode; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 240 240" fill="none" xmlns="http://www.w3.org/2000/svg">{children}</svg>;
}

/** Scanning a product → verified. */
export function ArtScan({ size }: { size?: number }) {
  const g = useId();
  return (
    <Frame size={size}>
      <defs>
        <linearGradient id={g} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#a6c49c" /><stop offset=".55" stopColor="#b7bf9a" /><stop offset="1" stopColor="#cbb492" />
        </linearGradient>
      </defs>
      <circle cx="120" cy="120" r="96" fill="var(--brand-50)" />
      {/* phone */}
      <rect x="74" y="48" width="92" height="150" rx="20" fill="var(--surface)" stroke="var(--line-2)" strokeWidth="2" />
      <rect x="86" y="66" width="68" height="84" rx="12" fill={`url(#${g})`} opacity=".14" />
      {/* product on screen */}
      <rect x="104" y="80" width="32" height="54" rx="6" fill="var(--surface)" stroke={`url(#${g})`} strokeWidth="2.5" />
      <path d="M110 92h20M110 100h20M110 108h14" stroke="var(--ink-3)" strokeWidth="2.5" strokeLinecap="round" />
      {/* scan line */}
      <rect x="90" y="112" width="60" height="4" rx="2" fill={`url(#${g})`} />
      {/* verified badge */}
      <circle cx="150" cy="156" r="22" fill={`url(#${g})`} />
      <path d="M141 156l6 6 11-12" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="58" cy="70" r="6" fill="#c98b7a" opacity=".55" />
      <circle cx="182" cy="102" r="4" fill="#8ca98a" opacity=".6" />
    </Frame>
  );
}

/** A household of members. */
export function ArtFamily({ size }: { size?: number }) {
  const g = useId();
  return (
    <Frame size={size}>
      <defs>
        <linearGradient id={g} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#a6c49c" /><stop offset="1" stopColor="#cbb492" />
        </linearGradient>
      </defs>
      <circle cx="120" cy="120" r="96" fill="var(--brand-50)" />
      {/* three avatars */}
      <g>
        <circle cx="86" cy="118" r="30" fill="var(--surface)" stroke="var(--line-2)" strokeWidth="2" />
        <circle cx="86" cy="110" r="10" fill="var(--ink-3)" /><path d="M70 134a16 16 0 0 1 32 0z" fill="var(--ink-3)" />
      </g>
      <g>
        <circle cx="154" cy="118" r="30" fill="var(--surface)" stroke="var(--line-2)" strokeWidth="2" />
        <circle cx="154" cy="110" r="10" fill="var(--ink-3)" /><path d="M138 134a16 16 0 0 1 32 0z" fill="var(--ink-3)" />
      </g>
      <g>
        <circle cx="120" cy="96" r="34" fill={`url(#${g})`} />
        <circle cx="120" cy="86" r="11" fill="#fff" /><path d="M102 112a18 18 0 0 1 36 0z" fill="#fff" />
      </g>
      <circle cx="196" cy="150" r="18" fill="var(--surface)" stroke="var(--line-2)" strokeWidth="2" />
      <path d="M196 143v14M189 150h14" stroke={`url(#${g})`} strokeWidth="3" strokeLinecap="round" />
    </Frame>
  );
}

/** Shield / privacy-safety, facts-only promise. */
export function ArtShield({ size }: { size?: number }) {
  const g = useId();
  return (
    <Frame size={size}>
      <defs>
        <linearGradient id={g} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#a6c49c" /><stop offset="1" stopColor="#cbb492" />
        </linearGradient>
      </defs>
      <circle cx="120" cy="120" r="96" fill="var(--brand-50)" />
      <path d="M120 58l44 18v30c0 28-19 50-44 62-25-12-44-34-44-62V76l44-18z" fill="var(--surface)" stroke={`url(#${g})`} strokeWidth="3" />
      <path d="M100 120l14 14 28-30" stroke={`url(#${g})`} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    </Frame>
  );
}

/** Empty / nothing-here. */
export function ArtEmpty({ size }: { size?: number }) {
  return (
    <Frame size={size ?? 150}>
      <circle cx="120" cy="120" r="88" fill="var(--surface-2)" />
      <rect x="74" y="92" width="92" height="66" rx="12" fill="var(--surface)" stroke="var(--line-2)" strokeWidth="2.5" />
      <path d="M74 108h92" stroke="var(--line-2)" strokeWidth="2.5" />
      <circle cx="86" cy="100" r="2.4" fill="var(--ink-3)" /><circle cx="95" cy="100" r="2.4" fill="var(--ink-3)" />
      <path d="M104 134h32M104 144h20" stroke="var(--ink-3)" strokeWidth="3" strokeLinecap="round" />
    </Frame>
  );
}
