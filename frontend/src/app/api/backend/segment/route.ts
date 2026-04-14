/**
 * Mock del endpoint /api/segment del backend Python.
 * Devuelve datos de segmentación falsos pero con la forma correcta,
 * para poder probar toda la UI sin necesidad de Python ni GPU.
 *
 * El "suelo" mock ocupa el trapecio inferior de la imagen (perspectiva básica).
 */

import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  // Simulamos el tiempo de procesamiento de los modelos IA
  await new Promise((r) => setTimeout(r, 1200));

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ detail: "No se recibió ningún archivo" }, { status: 400 });
  }

  // Dimensiones ficticias (el frontend las usará para escalar el render)
  const W = 800;
  const H = 600;

  // Trapecio que simula un suelo en perspectiva:
  //   punto de fuga ~centrado, suelo ocupa el 55% inferior
  const floorY = Math.round(H * 0.45);
  const vanishMargin = Math.round(W * 0.25); // margen en la línea de horizonte

  const floor_corners = [
    [vanishMargin, floorY],           // arriba-izquierda
    [W - vanishMargin, floorY],       // arriba-derecha
    [W, H],                           // abajo-derecha
    [0, H],                           // abajo-izquierda
  ];

  // Homografía identidad (suficiente para el mock)
  const homography_matrix = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ];

  // Máscara RLE mínima (el frontend no la usa directamente todavía)
  const totalPixels = W * H;
  const floorPixels = Math.round(totalPixels * 0.35);
  const floor_mask_rle = {
    start_value: 0,
    runs: [totalPixels - floorPixels, floorPixels],
    shape: [H, W],
  };

  // Mapa de profundidad tiny (30x40) con gradiente simple
  const depthRows = 30;
  const depthCols = 40;
  const depth_map = Array.from({ length: depthRows }, (_, row) =>
    Array.from({ length: depthCols }, () =>
      Math.round((row / depthRows) * 255)
    )
  );

  return NextResponse.json({
    image_size: { width: W, height: H },
    floor_mask_rle,
    floor_corners,
    homography_matrix,
    depth_map,
  });
}
