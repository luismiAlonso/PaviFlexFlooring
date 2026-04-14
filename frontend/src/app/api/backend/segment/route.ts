/**
 * Este endpoint ahora solo devuelve la configuración necesaria para que
 * el CLIENTE llame a HuggingFace directamente, evitando el timeout de 10s
 * de Netlify free tier.
 *
 * El cliente recibe el modelo y un token de solo lectura (HF_TOKEN).
 * Para producción usar un token con permisos mínimos.
 */

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    hf_token: process.env.HF_TOKEN ?? null,
    model: "nvidia/segformer-b0-finetuned-ade-512-512",
  });
}
