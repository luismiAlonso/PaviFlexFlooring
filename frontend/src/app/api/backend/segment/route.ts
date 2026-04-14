/**
 * Edge Runtime — timeout 30s en Netlify (vs 10s serverless normal).
 * Hace el proxy a HuggingFace desde servidor (sin CORS), sin sharp.
 */

export const runtime = "edge";

// HF cambió su API en 2025 — probamos URLs en orden hasta que una funcione
const MODEL = "nvidia/segformer-b0-finetuned-ade-512-512";
const HF_URLS = [
  `https://api-inference.huggingface.co/models/${MODEL}`,
  `https://api-inference.huggingface.co/pipeline/image-segmentation/${MODEL}`,
  `https://router.huggingface.co/hf-inference/models/${MODEL}`,
];

export async function POST(req: Request) {
  const token = process.env.HF_TOKEN;

  let imageBlob: Blob;
  let contentType: string;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return jsonError("No file received", 400);
    imageBlob = file;
    contentType = file.type;
  } catch {
    return jsonError("Could not parse form data", 400);
  }

  if (!token) {
    console.warn("[segment] No HF_TOKEN — using mock");
    return mockJson(await getImageSize(imageBlob), "mock:no_token");
  }

  // Prueba cada URL disponible con reintentos para 503
  let attempt = 0;
  const maxAttempts = 6;
  let urlIndex = 0;

  while (attempt < maxAttempts) {
    attempt++;
    const url = HF_URLS[urlIndex % HF_URLS.length];
    console.log(`[segment] attempt ${attempt}/${maxAttempts} → ${url}`);

    let hfRes: Response;
    try {
      hfRes = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": contentType },
        body: imageBlob,
      });
    } catch (err) {
      console.error("[segment] fetch error:", err);
      return mockJson(await getImageSize(imageBlob), `mock:fetch_error:${String(err).slice(0,60)}`);
    }

    const bodyPreview = await hfRes.clone().text().then(t => t.slice(0, 150)).catch(() => "");
    console.log(`[segment] status ${hfRes.status} url=${url.split("/").pop()} body=${bodyPreview}`);

    if (hfRes.ok) {
      let segments: Array<{ label: string; mask: string }>;
      try {
        segments = await hfRes.json();
      } catch (e) {
        return mockJson(await getImageSize(imageBlob), `mock:json_parse_error:${e}`);
      }

      console.log("[segment] Labels:", segments.map((s) => s.label).join(", "));

      const floorSeg = segments.find((s) => s.label?.toLowerCase().includes("floor"));
      if (!floorSeg?.mask) {
        const labels = segments.map((s) => s.label).join(",");
        console.warn("[segment] No floor label. Got:", labels);
        return mockJson(await getImageSize(imageBlob), `mock:no_floor(${labels.slice(0,50)})`);
      }

      try {
        const { width, height } = await getImageSize(imageBlob);
        const corners512 = await extractCorners(floorSeg.mask);
        const corners = corners512.map(([x, y]) => [
          Math.round(x * width / 512),
          Math.round(y * height / 512),
        ]);
        return Response.json(buildResult(width, height, corners, "segformer"));
      } catch (e) {
        console.error("[segment] extractCorners error:", e);
        return mockJson(await getImageSize(imageBlob), `mock:corners_error`);
      }
    }

    if (hfRes.status === 503) {
      const body = await hfRes.json().catch(() => ({})) as { estimated_time?: number };
      const wait = Math.min((body.estimated_time ?? 8) * 1000, 12000);
      console.log(`[segment] Model loading, waiting ${wait}ms`);
      await sleep(wait);
      continue;
    }

    if (hfRes.status === 410 || hfRes.status === 404) {
      // URL deprecated — probar la siguiente
      console.warn(`[segment] ${hfRes.status} on ${url} — trying next URL`);
      urlIndex++;
      if (urlIndex >= HF_URLS.length) {
        return mockJson(await getImageSize(imageBlob), `mock:hf_${hfRes.status}:all_urls_failed`);
      }
      continue;
    }

    console.error(`[segment] HF error ${hfRes.status}:`, bodyPreview);
    return mockJson(await getImageSize(imageBlob), `mock:hf_${hfRes.status}:${bodyPreview.slice(0,50)}`);
  }

  return mockJson(await getImageSize(imageBlob), "mock:max_retries");
}

// ─── Extracción de esquinas de la máscara ────────────────────────────────────

async function extractCorners(maskDataUrl: string): Promise<number[][]> {
  const base64 = maskDataUrl.replace(/^data:image\/\w+;base64,/, "");
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const blob = new Blob([bytes], { type: "image/png" });

  // Decodificar PNG usando createImageBitmap + OffscreenCanvas (disponible en Edge/Deno)
  let pixelData: Uint8ClampedArray;
  let mW: number, mH: number;

  try {
    const bitmap = await createImageBitmap(blob);
    mW = bitmap.width;
    mH = bitmap.height;
    console.log(`[segment] Mask decoded: ${mW}x${mH}`);

    const canvas = new OffscreenCanvas(mW, mH);
    const ctx = canvas.getContext("2d") as OffscreenCanvasRenderingContext2D;
    ctx.drawImage(bitmap, 0, 0);
    pixelData = ctx.getImageData(0, 0, mW, mH).data;
  } catch (e) {
    console.error("[segment] createImageBitmap failed:", e);
    throw new Error(`Canvas decode failed: ${e}`);
  }

  // Recopilar píxeles del suelo (R > 128 = blanco = suelo)
  const top: Array<[number, number]> = [];
  const bot: Array<[number, number]> = [];
  const midY = mH / 2;

  for (let y = 0; y < mH; y++) {
    for (let x = 0; x < mW; x++) {
      if (pixelData[(y * mW + x) * 4] > 128) {
        (y < midY ? top : bot).push([x, y]);
      }
    }
  }

  const all = [...top, ...bot];
  if (all.length < 10) throw new Error(`Floor mask too small: ${all.length}px`);

  console.log(`[segment] Floor pixels: top=${top.length} bot=${bot.length}`);

  const src = top.length > 0 ? top : all;
  const btm = bot.length > 0 ? bot  : all;

  const minX = (a: Array<[number,number]>) => Math.min(...a.map(([x]) => x));
  const maxX = (a: Array<[number,number]>) => Math.max(...a.map(([x]) => x));
  const minY = (a: Array<[number,number]>) => Math.min(...a.map(([,y]) => y));
  const maxY = (a: Array<[number,number]>) => Math.max(...a.map(([,y]) => y));

  return [
    [minX(src), minY(src)],
    [maxX(src), minY(src)],
    [maxX(btm), maxY(btm)],
    [minX(btm), maxY(btm)],
  ];
}

// ─── Utilidades ──────────────────────────────────────────────────────────────

async function getImageSize(blob: Blob): Promise<{ width: number; height: number }> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  if (bytes[1] === 0x50) { // PNG
    const w = bytes[16] << 24 | bytes[17] << 16 | bytes[18] << 8 | bytes[19];
    const h = bytes[20] << 24 | bytes[21] << 16 | bytes[22] << 8 | bytes[23];
    if (w > 0 && h > 0) return { width: w, height: h };
  }
  for (let i = 0; i < bytes.length - 9; i++) {
    if (bytes[i] === 0xff && (bytes[i+1] === 0xc0 || bytes[i+1] === 0xc2)) {
      const h = bytes[i+5] << 8 | bytes[i+6];
      const w = bytes[i+7] << 8 | bytes[i+8];
      if (w > 0 && h > 0) return { width: w, height: h };
    }
  }
  return { width: 1280, height: 960 };
}

function buildResult(W: number, H: number, corners: number[][], source: string) {
  return {
    image_size: { width: W, height: H },
    floor_corners: corners,
    homography_matrix: [[1,0,0],[0,1,0],[0,0,1]],
    floor_mask_rle: { start_value: 0, runs: [W*H - Math.round(W*H*0.35), Math.round(W*H*0.35)], shape: [H, W] },
    depth_map: Array.from({ length: 30 }, (_, row) => Array.from({ length: 40 }, () => Math.round(row/30*255))),
    source,
  };
}

async function mockJson(size: { width: number; height: number }, source: string) {
  const { width: W, height: H } = size;
  const hY = Math.round(H * 0.48);
  const mg = Math.round(W * 0.20);
  return Response.json(buildResult(W, H, [[mg,hY],[W-mg,hY],[W,H],[0,H]], source));
}

function jsonError(msg: string, status: number) {
  return Response.json({ detail: msg }, { status });
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
