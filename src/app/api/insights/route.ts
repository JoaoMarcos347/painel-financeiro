import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { fetchAllTransactions, getAccounts, getNomeGrupo } from "@/lib/queries";
import { gerarComentarios } from "@/lib/insights";
import { query } from "@/lib/db";
import { MODELO_IA } from "@/lib/anthropic";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as Record<string, string>));
    const mesAlvo: string | undefined = body.mes;

    const [txs, accounts, nomeGrupo] = await Promise.all([
      fetchAllTransactions(),
      getAccounts(),
      getNomeGrupo(),
    ]);
    if (!txs.length) {
      return NextResponse.json(
        { ok: false, erro: "Sem transações para analisar. Sincronize primeiro." },
        { status: 400 }
      );
    }

    const { comentarios, mes, tokens_in, tokens_out } = await gerarComentarios(
      txs,
      accounts,
      nomeGrupo,
      mesAlvo
    );

    await query(
      `insert into insights_cache
         (id, reference_month, content, model, input_tokens, output_tokens, generated_at)
       values ($1,$2,$3,$4,$5,$6, now())
       on conflict (id) do update set
         reference_month = excluded.reference_month, content = excluded.content,
         model = excluded.model, input_tokens = excluded.input_tokens,
         output_tokens = excluded.output_tokens, generated_at = now()`,
      [mes, mes, JSON.stringify(comentarios), MODELO_IA, tokens_in, tokens_out]
    );

    revalidatePath("/");
    return NextResponse.json({ ok: true, mes });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
