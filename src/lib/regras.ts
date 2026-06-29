import { query } from "./db";
import type { TxRow } from "./queries";

export type PlanoConta = { codigo: string | null; nome: string; label: string };

export async function getPlanoContas(): Promise<PlanoConta[]> {
  const data = await query<{ codigo: string | null; nome: string }>(
    `select code as codigo, name as nome from chart_of_accounts order by sort_order asc nulls last`
  );
  const seen = new Set<string>();
  const out: PlanoConta[] = [];
  for (const r of data) {
    const codigo = r.codigo && r.codigo.trim() ? r.codigo.trim() : null;
    const label = codigo ? `${codigo} — ${r.nome}` : r.nome;
    if (seen.has(label)) continue;
    seen.add(label);
    out.push({ codigo, nome: r.nome, label });
  }
  return out;
}

export type RuleRow = {
  id: string;
  tipo_match: string;
  valor_match: string;
  conta_codigo: string | null;
  conta_nome: string;
  prioridade: number;
  ativo: boolean;
};

export async function getRules(): Promise<RuleRow[]> {
  return query<RuleRow>(
    `select id,
            case match_type
              when 'keyword' then 'palavra'
              when 'category' then 'categoria'
              when 'internal' then 'interna'
              else match_type end as tipo_match,
            match_value as valor_match, account_code as conta_codigo,
            account_name as conta_nome, priority as prioridade, active as ativo
       from rules order by priority asc`
  );
}

export type Pendencia = {
  chave: string;
  nome: string;
  doc: string;
  tipo: string;
  qtd: number;
  total: number;
};

/** Agrupa as transações "a classificar" por contraparte (maior valor primeiro). */
export function aClassificarAgrupado(txs: TxRow[], topN = 50): Pendencia[] {
  const m = new Map<string, Pendencia>();
  for (const t of txs) {
    if (t.classif_origem !== "—") continue;
    const nome = t.contraparte_nome || "(sem nome)";
    const doc = (t.contraparte_doc ?? "").replace(/\D/g, "");
    const chave = doc || "N:" + nome.toUpperCase();
    const e =
      m.get(chave) ??
      {
        chave,
        nome,
        doc,
        tipo: t.tipo === "CREDIT" ? "Entrada" : "Saída",
        qtd: 0,
        total: 0,
      };
    e.qtd++;
    e.total += Math.abs(t.valor ?? 0);
    m.set(chave, e);
  }
  return [...m.values()].sort((a, b) => b.total - a.total).slice(0, topN);
}
