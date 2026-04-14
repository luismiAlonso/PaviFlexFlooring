/**
 * Segmentación de suelo con SegFormer B0 ADE20K via HuggingFace Inference API.
 *
 * Modelo: nvidia/segformer-b0-finetuned-ade-512-512
 * Dataset: ADE20K — incluye etiqueta "floor" específica para suelos de interior
 *
 * Flujo:
 *   1. Recibe la imagen del usuario
 *   2. La envía a HF Inference API
 *   3. Extrae la máscara de la etiqueta "floor"
 *   4. Calcula los 4 vértices del polígono de suelo
 *   5. Devuelve corners + dimensiones al frontend
 *
 * Si HF_TOKEN no está configurado cae al mock (trapecio fijo).
 */

import { NextRequest, NextResponse } from "next/server";
import { HfInference } from "@huggingface/inference";
import sharp from "sharp";

const MODEL = "nvidia/segformer-b0-finetuned-ade-512-512";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ detail: "No se recibió ningún archivo" }, { status: 400 });
  }

  if (file.size > 20 * 1024 * 1024) {
    return NextResponse.json({ detail: "Imagen demasiado grande (max 20 MB)" }, { status: 413 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // Sin token → fallback al mock
  if (!process.env.HF_TOKEN) {
    console.warn("[segment] HF_TOKEN no configurado — usando mock");
    return mockResponse(buffer, file.type, "mock:no_token");
  }

  console.log("[segment] HF_TOKEN encontrado, llamando a SegFormer...");

  try {
    const corners = await segmentFloorHF(buffer);
    const { width, height } = await getImageSize(buffer);
    console.log("[segment] SegFormer OK — corners:", JSON.stringify(corners));
    return NextResponse.json({ ...buildResponse(width, height, corners), source: "segformer" });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : "";
    console.error("[segment] HF error completo:", msg, stack);
    return mockResponse(buffer, file.type, `mock:hf_error:${msg.slice(0, 80)}`);
  }
}

// ─── HuggingFace ────────────────────────────────────────────────────────────

async function segmentFloorHF(imageBuffer: Buffer): Promise<number[][]> {
  const hf = new HfInference(process.env.HF_TOKEN);

  const segments = await hf.imageSegmentation({
    model: MODEL,
    data: new Blob([new Uint8Array(imageBuffer)]),
  }, {
    wait_for_model: true,  // espera si el modelo está cargando (free tier)
    use_cache: false,
  });

  // ADE20K usa "floor" o "floor, flooring" como etiqueta
  const floorSeg = segments.find((s) =>
    s.label?.toLowerCase().includes("floor")
  );

  if (!floorSeg?.mask) {
    throw new Error(`No floor segment found. Labels: ${segments.map(s => s.label).join(", ")}`);
  }

  // La máscara llega como data URL "data:image/png;base64,..."
  const base64 = floorSeg.mask.replace(/^data:image\/\w+;base64,/, "");
  const maskBuffer = Buffer.from(base64, "base64");

  return extractCornersFromMask(maskBuffer);
}

/**
 * Dada una máscara PNG (blanco = suelo), devuelve los 4 vértices
 * del trapecio de suelo en coordenadas de la imagen original.
 *
 * Estrategia: escanea la máscara buscando los píxeles más extremos
 * en cada cuadrante para construir un trapecio realista.
 */
async function extractCornersFromMask(maskBuffer: Buffer): Promise<number[][]> {
  const { data, info } = await sharp(maskBuffer)
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width: mW, height: mH } = info;

  // Recopilar todos los píxeles de suelo (valor > 128 = blanco)
  const floorPixels: Array<[number, number]> = [];
  for (let y = 0; y < mH; y++) {
    for (let x = 0; x < mW; x++) {
      if (data[y * mW + x] > 128) {
        floorPixels.push([x, y]);
      }
    }
  }

  if (floorPixels.length < 10) {
    throw new Error("Máscara de suelo demasiado pequeña");
  }

  // Dividir en mitad superior e inferior para sacar los 4 vértices
  const midY = mH / 2;
  const topPixels    = floorPixels.filter(([, y]) => y < midY);
  const bottomPixels = floorPixels.filter(([, y]) => y >= midY);

  const minX = (arr: Array<[number, number]>) => Math.min(...arr.map(([x]) => x));
  const maxX = (arr: Array<[number, number]>) => Math.max(...arr.map(([x]) => x));
  const minY = (arr: Array<[number, number]>) => Math.min(...arr.map(([, y]) => y));
  const maxY = (arr: Array<[number, number]>) => Math.max(...arr.map(([, y]) => y));

  const src = topPixels.length > 0 ? topPixels : floorPixels;
  const btm = bottomPixels.length > 0 ? bottomPixels : floorPixels;

  // 4 corners: [TL, TR, BR, BL] en espacio de la máscara (512x512)
  const corners512: number[][] = [
    [minX(src), minY(src)],  // TL
    [maxX(src), minY(src)],  // TR
    [maxX(btm), maxY(btm)],  // BR
    [minX(btm), maxY(btm)],  // BL
  ];

  return corners512;
}

// ─── Utilidades ──────────────────────────────────────────────────────────────

async function getImageSize(buf: Buffer): Promise<{ width: number; height: number }> {
  const meta = await sharp(buf).metadata();
  return { width: meta.width ?? 1280, height: meta.height ?? 960 };
}

function buildResponse(W: number, H: number, corners512: number[][]) {
  // La máscara es 512×512, escalar corners a dimensiones reales de la imagen
  const scaleX = W / 512;
  const scaleY = H / 512;
  const corners = corners512.map(([x, y]) => [
    Math.round(x * scaleX),
    Math.round(y * scaleY),
  ]);

  const totalPixels = W * H;
  const floorPixels = Math.round(totalPixels * 0.35);

  return {
    image_size: { width: W, height: H },
    floor_corners: corners,
    homography_matrix: [[1,0,0],[0,1,0],[0,0,1]],
    floor_mask_rle: {
      start_value: 0,
      runs: [totalPixels - floorPixels, floorPixels],
      shape: [H, W],
    },
    depth_map: Array.from({ length: 30 }, (_, row) =>
      Array.from({ length: 40 }, () => Math.round((row / 30) * 255))
    ),
  };
}

// ─── Mock (fallback sin HF_TOKEN) ────────────────────────────────────────────

async function mockResponse(buffer: Buffer, mimeType: string, source = "mock") {
  console.warn("[segment] Usando mock, source:", source);
  let W = 1280, H = 960;
  try {
    const meta = await sharp(buffer).metadata();
    W = meta.width ?? W;
    H = meta.height ?? H;
  } catch {
    ({ width: W, height: H } = getJpegPngSize(buffer, mimeType));
  }

  const horizonY = Math.round(H * 0.48);
  const margin   = Math.round(W * 0.20);
  const corners  = [
    [margin,   horizonY],
    [W-margin, horizonY],
    [W, H],
    [0, H],
  ];

  return NextResponse.json({ ...buildResponse(W, H, corners.map(([x,y]) => [x*512/W, y*512/H])), source });
}

function getJpegPngSize(bytes: Buffer, mime: string): { width: number; height: number } {
  try {
    if (mime === "image/png") {
      const w = (bytes[16] << 24)|(bytes[17] << 16)|(bytes[18] << 8)|bytes[19];
      const h = (bytes[20] << 24)|(bytes[21] << 16)|(bytes[22] << 8)|bytes[23];
      if (w > 0 && h > 0) return { width: w, height: h };
    }
    if (mime.includes("jpeg") || mime.includes("jpg")) {
      for (let i = 0; i < bytes.length - 9; i++) {
        if (bytes[i] === 0xff && (bytes[i+1] === 0xc0 || bytes[i+1] === 0xc2)) {
          const h = (bytes[i+5] << 8)|bytes[i+6];
          const w = (bytes[i+7] << 8)|bytes[i+8];
          if (w > 0 && h > 0) return { width: w, height: h };
        }
      }
    }
  } catch { /* */ }
  return { width: 1280, height: 960 };
}
