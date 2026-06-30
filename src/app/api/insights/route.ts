import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { fetchAllTransactions, getAccounts, getNomeGrupo } from "@/lib/queries";
import { gerarComentarios } from "@/lib/insights";
import { query } from "@/lib/db";
import { MODELO_IA } from "@/lib/anthropic";
import { isDemo } from "@/lib/config";

export const runtime = "nodejs";
export const maxDuration = 300;

// Comentários prontos para o modo demonstração (sem chamar a IA).
const COMENTARIOS_DEMO = {
  resumo:
    "Mês positivo: receitas em alta e despesas estáveis, com resultado de ~R$ 65 mil (margem ~46%). Caixa saudável, com folga de ~3 meses.",
  kpis: "Receita cresceu vs o mês anterior e as despesas ficaram controladas — melhor resultado do semestre.",
  donut: "Despesas concentradas em Pessoal (~50%) e Fornecedores; o restante bem distribuído.",
  maiores_gastos: "Salários, Fornecedores e Pró-labore lideram as saídas do mês.",
  fluxo: "Entradas superaram as saídas o mês todo — o caixa terminou no positivo.",
  evolucao: "Tendência de crescimento: as entradas sobem mês a mês com as saídas controladas.",
  movers: "Fornecedores e Pró-labore subiram; Impostos e Aluguel recuaram vs o mês anterior.",
  recorrentes: "Contas recorrentes em linha com a média; nada fora do padrão.",
  heatmap: "Pessoal é o grupo mais pesado em todos os meses; os demais seguem estáveis.",
  tendencia: "Resultado positivo e crescente nos últimos meses.",
  top_pagadores: "Recebimentos pulverizados entre clientes diversos e contratos de serviço.",
};

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as Record<string, string>));
    const mesAlvo: string | undefined = body.mes;

    // Modo demonstração: grava comentários prontos (sem chamar a IA, sem custo).
    if (isDemo) {
      const mes = mesAlvo || "2026-06";
      await query(
        `insert into insights_cache
           (id, reference_month, content, model, input_tokens, output_tokens, generated_at)
         values ($1,$2,$3,'demo',0,0, now())
         on conflict (id) do update set
           reference_month = excluded.reference_month, content = excluded.content,
           model = 'demo', generated_at = now()`,
        [mes, mes, JSON.stringify(COMENTARIOS_DEMO)]
      );
      revalidatePath("/");
      return NextResponse.json({ ok: true, mes });
    }

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
