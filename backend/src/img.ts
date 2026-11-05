// Offline SVG placeholder for catalog cards. A deterministic pastel gradient per
// seed plus the seed label, so mock products render nicely without any network
// image. In production these are replaced by licensed partner photos.

function hashHue(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 360;
  return h;
}

export function placeholderSvg(seed: string): string {
  const hue = hashHue(seed);
  const c1 = `hsl(${hue} 70% 82%)`;
  const c2 = `hsl(${(hue + 40) % 360} 65% 70%)`;
  const label = seed.slice(0, 18);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="180" viewBox="0 0 240 180">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/>
  </linearGradient></defs>
  <rect width="240" height="180" rx="16" fill="url(#g)"/>
  <circle cx="120" cy="74" r="34" fill="rgba(255,255,255,0.55)"/>
  <text x="120" y="82" font-family="system-ui,sans-serif" font-size="30" text-anchor="middle">🛒</text>
  <text x="120" y="150" font-family="system-ui,sans-serif" font-size="14" fill="rgba(0,0,0,0.55)" text-anchor="middle">${label}</text>
</svg>`;
}
