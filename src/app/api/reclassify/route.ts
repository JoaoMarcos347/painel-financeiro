import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { query } from "@/lib/db";
import { invalidateTxCache } from "@/lib/queries";
import { classify, type Rule } from "@/lib/categorize";
import type { AutmaisTx } from "@/lib/autmais";

export const runtime = "nodejs";
export const maxDuration = 300;

/** Re-aplica as regras atuais às transações já armazenadas (sem buscar na Autmais). */
export async function POST() {
  const comps = await query<{ cnpj: string | null }>(`select cnpj from companies`);
  const ownDocs = new Set<string>();
  for (const c of comps) {
    const d = (c.cnpj ?? "").replace(/\D/g, "");
    if (d.length >= 11) ownDocs.add(d);
  }

  // Regras ativas (traduz match_type EN -> PT pro classify)
  const rules = await query<Rule>(
    `select case match_type
              when 'keyword' then 'palavra'
              when 'category' then 'categoria'
              when 'internal' then 'interna'
              else match_type end as tipo_match,
            match_value as valor_match, account_code as conta_codigo,
            account_name as conta_nome, priority as prioridade
       from rules where active = true`
  );

  const rows = await query<{ id: string; bruto: AutmaisTx }>(`select id, raw as bruto from transactions`);
  let updated = 0;
  for (const row of rows) {
    const c = classify(row.bruto, rules, ownDocs);
    await query(
      `update transactions set account_code=$1, account_name=$2, classification_source=$3,
              classification_confidence=$4, is_internal=$5 where id=$6`,
      [c.conta_codigo, c.conta_nome, c.origem, c.confianca, c.is_internal, row.id]
    );
    updated++;
  }

  invalidateTxCache();
  revalidatePath("/", "layout");
  return NextResponse.json({ ok: true, atualizadas: updated });
}
