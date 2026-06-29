import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { runSync } from "@/lib/sync";
import { config } from "@/lib/config";

export const runtime = "nodejs";
export const maxDuration = 300;

/** Sincronização automática (Vercel Cron). Janela dos últimos 40 dias. */
export async function GET(req: Request) {
  const secret = config.cronSecret;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`)
      return NextResponse.json({ ok: false, erro: "não autorizado" }, { status: 401 });
  }
  const d = new Date();
  d.setDate(d.getDate() - 40);
  const start = d.toISOString().slice(0, 10);
  const end = new Date().toISOString().slice(0, 10);
  try {
    const r = await runSync(start, end);
    revalidatePath("/", "layout");
    return NextResponse.json({ ok: true, ...r, periodo: { start, end } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
