export interface Texture {
  id: string;
  name: string;
  category: "wood" | "tile" | "stone" | "vinyl" | "concrete";
  color: string;      // color principal (hex)
  color2: string;     // color secundario para patrón
  pattern: "planks" | "grid" | "herringbone" | "plain";
  tileSize: number;   // tamaño real en metros (para escalar UV)
  // Cuando existan archivos reales, añadir:
  // url: string;
  // thumbnailUrl: string;
}

export const TEXTURES: Texture[] = [
  {
    id: "oak-natural",
    name: "Roble Natural",
    category: "wood",
    color: "#c8a96e",
    color2: "#b08040",
    pattern: "planks",
    tileSize: 0.6,
  },
  {
    id: "oak-dark",
    name: "Roble Oscuro",
    category: "wood",
    color: "#6b4c2a",
    color2: "#4a3018",
    pattern: "planks",
    tileSize: 0.6,
  },
  {
    id: "marble-white",
    name: "Marmol Blanco",
    category: "stone",
    color: "#f0ede8",
    color2: "#d0cac0",
    pattern: "plain",
    tileSize: 0.8,
  },
  {
    id: "concrete-raw",
    name: "Microcemento",
    category: "concrete",
    color: "#9a9a9a",
    color2: "#7a7a7a",
    pattern: "plain",
    tileSize: 1.0,
  },
  {
    id: "hex-white",
    name: "Hidraulico Hex",
    category: "tile",
    color: "#e8e4df",
    color2: "#b0a898",
    pattern: "grid",
    tileSize: 0.3,
  },
  {
    id: "terracota",
    name: "Terracota",
    category: "tile",
    color: "#c1603a",
    color2: "#8a3a1a",
    pattern: "grid",
    tileSize: 0.4,
  },
  {
    id: "slate-gray",
    name: "Pizarra Gris",
    category: "stone",
    color: "#5a6472",
    color2: "#3a4450",
    pattern: "grid",
    tileSize: 0.5,
  },
  {
    id: "beige-tile",
    name: "Gres Beige",
    category: "tile",
    color: "#d4bc98",
    color2: "#b09878",
    pattern: "grid",
    tileSize: 0.6,
  },
  {
    id: "herringbone",
    name: "Espiga",
    category: "wood",
    color: "#a07840",
    color2: "#806030",
    pattern: "herringbone",
    tileSize: 0.5,
  },
];
