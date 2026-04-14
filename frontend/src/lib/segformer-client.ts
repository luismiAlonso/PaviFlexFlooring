/**
 * Segmentación de suelo ejecutada en el navegador, llamando directamente
 * a la HuggingFace Inference API. Evita el timeout de 10s de Netlify.
 *
 * Flujo:
 *   1. Obtiene el token HF del servidor (GET /api/backend/segment)
 *   2. Envía la imagen a HF Inference API
 *   3. Recibe máscara PNG del segmento "floor"
 *   4. Extrae los 4 vértices del polígono de suelo
 *   5. Devuelve el resultado con el mismo formato que el backend Python
 */

const HF_API = "https://api-inference.huggingface.co/models";

export interface SegmentResult {
  image_size: { width: number; height: number };
  floor_corners: number[][];
  homography_matrix: number[][];
  floor_mask_rle: { start_value: number; runs: number[]; shape: number[] };
  depth_map: number[][];
  source: string;
}

export async function segmentFloorClient(file: File): Promise<SegmentResult> {
  // 1. Obtener config del servidor
  const config = await fetch("/api/backend/segment").then((r) => r.json());
  const { hf_token, model } = config as { hf_token: string | null; model: string };

  // Obtener dimensiones reales de la imagen
  const { width: W, height: H } = await getImageDimensions(file);

  if (!hf_token) {
    console.warn("[segformer] Sin token HF — usando mock");
    return mockResult(W, H, "mock:no_token");
  }

  try {
    // 2. Llamar a HF Inference API directamente desde el browser
    const response = await fetch(`${HF_API}/${model}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${hf_token}`,
        "Content-Type": file.type,
        "x-wait-for-model": "true",  // espera si el modelo está cargando
      },
      body: file,
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`HF ${response.status}: ${errText.slice(0, 100)}`);
    }

    const segments = await response.json() as Array<{ label: string; mask: string }>;
    console.log("[segformer] Labels detectados:", segments.map((s) => s.label));

    // 3. Encontrar segmento de suelo
    const floorSeg = segments.find((s) => s.label?.toLowerCase().includes("floor"));

    if (!floorSeg?.mask) {
      const labels = segments.map((s) => s.label).join(", ");
      console.warn("[segformer] No floor found. Labels:", labels);
      return mockResult(W, H, `mock:no_floor(${labels.slice(0, 60)})`);
    }

    // 4. Extraer vértices de la máscara
    const corners512 = await extractCornersFromMaskUrl(floorSeg.mask);
    const corners = scaleCorners(corners512, W, H);

    return buildResult(W, H, corners, "segformer");

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[segformer] Error:", msg);
    return mockResult(W, H, `mock:error:${msg.slice(0, 60)}`);
  }
}

// ─── Extracción de vértices ──────────────────────────────────────────────────

async function extractCornersFromMaskUrl(maskDataUrl: string): Promise<number[][]> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);

      const { data, width: mW, height: mH } = ctx.getImageData(0, 0, img.width, img.height);

      // Recopilar píxeles de suelo (canal R > 128 = blanco)
      const topPixels:    Array<[number, number]> = [];
      const bottomPixels: Array<[number, number]> = [];
      const midY = mH / 2;

      for (let y = 0; y < mH; y++) {
        for (let x = 0; x < mW; x++) {
          const r = data[(y * mW + x) * 4];
          if (r > 128) {
            if (y < midY) topPixels.push([x, y]);
            else bottomPixels.push([x, y]);
          }
        }
      }

      const allPixels = [...topPixels, ...bottomPixels];
      if (allPixels.length < 10) {
        reject(new Error("Máscara de suelo vacía"));
        return;
      }

      const src = topPixels.length > 0 ? topPixels : allPixels;
      const btm = bottomPixels.length > 0 ? bottomPixels : allPixels;

      const minX = (arr: Array<[number, number]>) => Math.min(...arr.map(([x]) => x));
      const maxX = (arr: Array<[number, number]>) => Math.max(...arr.map(([x]) => x));
      const minY = (arr: Array<[number, number]>) => Math.min(...arr.map(([, y]) => y));
      const maxY = (arr: Array<[number, number]>) => Math.max(...arr.map(([, y]) => y));

      resolve([
        [minX(src), minY(src)],  // TL
        [maxX(src), minY(src)],  // TR
        [maxX(btm), maxY(btm)],  // BR
        [minX(btm), maxY(btm)],  // BL
      ]);
    };
    img.onerror = () => reject(new Error("No se pudo cargar la máscara"));
    img.src = maskDataUrl;
  });
}

// ─── Utilidades ──────────────────────────────────────────────────────────────

function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve({ width: img.width, height: img.height }); };
    img.onerror = () => { URL.revokeObjectURL(url); resolve({ width: 1280, height: 960 }); };
    img.src = url;
  });
}

function scaleCorners(corners512: number[][], W: number, H: number): number[][] {
  return corners512.map(([x, y]) => [Math.round(x * W / 512), Math.round(y * H / 512)]);
}

function buildResult(W: number, H: number, corners: number[][], source: string): SegmentResult {
  return {
    image_size: { width: W, height: H },
    floor_corners: corners,
    homography_matrix: [[1,0,0],[0,1,0],[0,0,1]],
    floor_mask_rle: {
      start_value: 0,
      runs: [W * H - Math.round(W * H * 0.35), Math.round(W * H * 0.35)],
      shape: [H, W],
    },
    depth_map: Array.from({ length: 30 }, (_, row) =>
      Array.from({ length: 40 }, () => Math.round((row / 30) * 255))
    ),
    source,
  };
}

function mockResult(W: number, H: number, source: string): SegmentResult {
  const horizonY = Math.round(H * 0.48);
  const margin   = Math.round(W * 0.20);
  const corners512 = [
    [margin * 512 / W,       horizonY * 512 / H],
    [(W - margin) * 512 / W, horizonY * 512 / H],
    [512, 512],
    [0,   512],
  ];
  return buildResult(W, H, scaleCorners(corners512, W, H), source);
}
