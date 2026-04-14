/**
 * Mock del endpoint /api/segment del backend Python.
 *
 * Lee las dimensiones reales de la imagen subida y genera un trapecio
 * de suelo proporcional a esas dimensiones.
 *
 * NOTA: Este mock siempre devuelve el mismo trapecio inferior — la
 * detección real de suelo la hará SAM 2 en el backend Python.
 */

import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  await new Promise((r) => setTimeout(r, 900));

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ detail: "No se recibió ningún archivo" }, { status: 400 });
  }

  // Leer dimensiones reales de la imagen
  const buffer = await file.arrayBuffer();
  const { width: W, height: H } = await getImageDimensions(buffer, file.type);

  // Trapecio de suelo en perspectiva central:
  //   - Horizonte al 48% de la altura
  //   - Punto de fuga centrado con margen del 20%
  //   - Suelo llega hasta la esquina inferior completa
  const horizonY  = Math.round(H * 0.48);
  const vanishPct = 0.20; // qué % de margen tiene la línea de horizonte
  const leftTop   = Math.round(W * vanishPct);
  const rightTop  = Math.round(W * (1 - vanishPct));

  const floor_corners = [
    [leftTop,  horizonY],  // arriba-izquierda
    [rightTop, horizonY],  // arriba-derecha
    [W,        H],          // abajo-derecha (esquina exacta)
    [0,        H],          // abajo-izquierda (esquina exacta)
  ];

  const homography_matrix = [[1,0,0],[0,1,0],[0,0,1]];

  const totalPixels = W * H;
  const floorPixels = Math.round(totalPixels * 0.38);
  const floor_mask_rle = {
    start_value: 0,
    runs: [totalPixels - floorPixels, floorPixels],
    shape: [H, W],
  };

  const depthRows = 30;
  const depthCols = 40;
  const depth_map = Array.from({ length: depthRows }, (_, row) =>
    Array.from({ length: depthCols }, () => Math.round((row / depthRows) * 255))
  );

  return NextResponse.json({
    image_size: { width: W, height: H },
    floor_mask_rle,
    floor_corners,
    homography_matrix,
    depth_map,
  });
}

/**
 * Lee el ancho y alto de la imagen a partir de sus bytes, sin dependencias externas.
 * Soporta JPEG y PNG (los formatos más comunes).
 */
async function getImageDimensions(
  buffer: ArrayBuffer,
  mimeType: string
): Promise<{ width: number; height: number }> {
  const bytes = new Uint8Array(buffer);

  try {
    if (mimeType === "image/png") {
      // PNG: ancho en bytes 16-19, alto en bytes 20-23
      const w = (bytes[16] << 24) | (bytes[17] << 16) | (bytes[18] << 8) | bytes[19];
      const h = (bytes[20] << 24) | (bytes[21] << 16) | (bytes[22] << 8) | bytes[23];
      if (w > 0 && h > 0) return { width: w, height: h };
    }

    if (mimeType === "image/jpeg" || mimeType === "image/jpg") {
      // JPEG: buscar marcador SOF (0xFF 0xC0 o 0xFF 0xC2)
      for (let i = 0; i < bytes.length - 9; i++) {
        if (bytes[i] === 0xff && (bytes[i + 1] === 0xc0 || bytes[i + 1] === 0xc2)) {
          const h = (bytes[i + 5] << 8) | bytes[i + 6];
          const w = (bytes[i + 7] << 8) | bytes[i + 8];
          if (w > 0 && h > 0) return { width: w, height: h };
        }
      }
    }
  } catch {
    // fallback below
  }

  // Fallback: aspect 4:3 estándar
  return { width: 1280, height: 960 };
}
