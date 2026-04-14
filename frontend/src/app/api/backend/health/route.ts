import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    models_loaded: false,
    device: "mock",
  });
}
