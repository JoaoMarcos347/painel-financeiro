import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { runSync } from "@/lib/sync";

export const runtime = "nodejs";
export const maxDuration = 300;

function diasAtras(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({} as Record<string, string>));
  // Padrão: janela recente (rápido, não estoura tempo no Vercel).
  // Para um resync completo, envie { "start": "2026-01-01" }.
  const start: string = body.start ?? diasAtras(75);
  const end: string = body.end ?? new Date().toISOString().slice(0, 10);
  try {
    const r = await runSync(start, end);
    revalidatePath("/", "layout");
    return NextResponse.json({ ok: true, ...r, periodo: { start, end } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
