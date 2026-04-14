/**
 * Texture catalog.
 *
 * DEV: Las URLs apuntan a /api/placeholder-texture?id=X que devuelve
 *      un SVG de color/patrón generado, sin necesidad de archivos de imagen.
 *
 * PROD: Sustituir url/thumbnailUrl por rutas reales a tu CDN o /public/textures/.
 */

export interface Texture {
  id: string;
  name: string;
  category: "wood" | "tile" | "stone" | "vinyl" | "concrete";
  url: string;
  thumbnailUrl: string;
  tileSize: number; // tamaño real en metros (para escalar UV)
}

const placeholder = (id: string) => `/api/placeholder-texture?id=${id}`;

export const TEXTURES: Texture[] = [
  {
    id: "oak-natural",
    name: "Roble Natural",
    category: "wood",
    url: placeholder("oak-natural"),
    thumbnailUrl: placeholder("oak-natural"),
    tileSize: 0.6,
  },
  {
    id: "oak-dark",
    name: "Roble Oscuro",
    category: "wood",
    url: placeholder("oak-dark"),
    thumbnailUrl: placeholder("oak-dark"),
    tileSize: 0.6,
  },
  {
    id: "marble-white",
    name: "Marmol Blanco",
    category: "stone",
    url: placeholder("marble-white"),
    thumbnailUrl: placeholder("marble-white"),
    tileSize: 0.8,
  },
  {
    id: "concrete-raw",
    name: "Microcemento",
    category: "concrete",
    url: placeholder("concrete-raw"),
    thumbnailUrl: placeholder("concrete-raw"),
    tileSize: 1.0,
  },
  {
    id: "hex-white",
    name: "Hidraulico Hex",
    category: "tile",
    url: placeholder("hex-white"),
    thumbnailUrl: placeholder("hex-white"),
    tileSize: 0.3,
  },
  {
    id: "terracota",
    name: "Terracota",
    category: "tile",
    url: placeholder("terracota"),
    thumbnailUrl: placeholder("terracota"),
    tileSize: 0.4,
  },
];
