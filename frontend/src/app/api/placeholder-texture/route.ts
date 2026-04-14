/**
 * Genera texturas SVG de placeholder para poder probar la UI
 * sin necesidad de archivos de imagen reales.
 *
 * GET /api/placeholder-texture?id=oak-natural
 */

import { NextRequest, NextResponse } from "next/server";

const TEXTURES: Record<string, { bg: string; lines: string; label: string }> = {
  "oak-natural": { bg: "#c8a96e", lines: "#b8955a", label: "Roble Natural" },
  "oak-dark":    { bg: "#6b4c2a", lines: "#5a3d20", label: "Roble Oscuro" },
  "marble-white":{ bg: "#f0ede8", lines: "#d9d4cc", label: "Marmol" },
  "concrete-raw":{ bg: "#8c8c8c", lines: "#7a7a7a", label: "Microcemento" },
  "hex-white":   { bg: "#e8e4df", lines: "#c8c2ba", label: "Hex" },
  "terracota":   { bg: "#c1603a", lines: "#a84f2e", label: "Terracota" },
};

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id") ?? "oak-natural";
  const t = TEXTURES[id] ?? TEXTURES["oak-natural"];

  const isWood = id.startsWith("oak");
  const isTile = id === "hex-white" || id === "terracota";

  let pattern = "";
  if (isWood) {
    // Plank lines
    pattern = `
      <line x1="0" y1="33" x2="100" y2="33" stroke="${t.lines}" stroke-width="1.5"/>
      <line x1="0" y1="66" x2="100" y2="66" stroke="${t.lines}" stroke-width="1.5"/>
      <line x1="50" y1="0"  x2="50"  y2="33" stroke="${t.lines}" stroke-width="0.8" opacity="0.5"/>
      <line x1="25" y1="33" x2="25"  y2="66" stroke="${t.lines}" stroke-width="0.8" opacity="0.5"/>
      <line x1="75" y1="66" x2="75"  y2="100" stroke="${t.lines}" stroke-width="0.8" opacity="0.5"/>
    `;
  } else if (isTile) {
    // Grid
    pattern = `
      <line x1="0" y1="25" x2="100" y2="25" stroke="${t.lines}" stroke-width="2"/>
      <line x1="0" y1="50" x2="100" y2="50" stroke="${t.lines}" stroke-width="2"/>
      <line x1="0" y1="75" x2="100" y2="75" stroke="${t.lines}" stroke-width="2"/>
      <line x1="25" y1="0" x2="25" y2="100" stroke="${t.lines}" stroke-width="2"/>
      <line x1="50" y1="0" x2="50" y2="100" stroke="${t.lines}" stroke-width="2"/>
      <line x1="75" y1="0" x2="75" y2="100" stroke="${t.lines}" stroke-width="2"/>
    `;
  } else {
    // Noise-like dots for concrete/marble
    pattern = `
      <circle cx="20" cy="20" r="3" fill="${t.lines}" opacity="0.3"/>
      <circle cx="60" cy="40" r="2" fill="${t.lines}" opacity="0.2"/>
      <circle cx="80" cy="70" r="4" fill="${t.lines}" opacity="0.25"/>
      <circle cx="35" cy="80" r="2" fill="${t.lines}" opacity="0.2"/>
    `;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
  <rect width="100" height="100" fill="${t.bg}"/>
  ${pattern}
  <text x="50" y="93" font-size="7" fill="${t.lines}" text-anchor="middle" font-family="sans-serif" opacity="0.7">${t.label}</text>
</svg>`;

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
