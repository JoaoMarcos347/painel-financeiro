import type { TxRow, Account } from "./queries";

const A_CLASSIFICAR = "A classificar / Outros";
const abs = (n: number | null) => Math.abs(n ?? 0);
const ym = (d: string) => d.slice(0, 7);
const round = (n: number) => Math.round(n);

/**
 * Contexto financeiro completo (multi-mês) entregue ao agente de chat.
 * Determinístico: serializa igual a cada chamada -> prompt caching funciona.
 */
export function montarContextoChat(
  txs: TxRow[],
  accounts: Account[],
  nomeGrupo: Record<string, string>
) {
  const reais = txs.filter((t) => t.data);
  const meses = [...new Set(reais.map((t) => ym(t.data!)))].sort();

  const evolucao = meses.map((m) => {
    let rec = 0,
      desp = 0;
    for (const t of reais) {
      if (t.is_internal || ym(t.data!) !== m) continue;
      if (t.tipo === "CREDIT") rec += abs(t.valor);
      else if (t.tipo === "DEBIT") desp += abs(t.valor);
    }
    return { mes: m, receitas: round(rec), despesas: round(desp), resultado: round(rec - desp) };
  });

  // Despesas por conta x mês (matriz compacta, top 30 contas por total)
  const totalConta = new Map<string, number>();
  const contaMesMap = new Map<string, Map<string, number>>();
  for (const t of reais) {
    if (t.is_internal || t.tipo !== "DEBIT") continue;
    const c = t.conta_nome ?? A_CLASSIFICAR;
    totalConta.set(c, (totalConta.get(c) ?? 0) + abs(t.valor));
    const mm = contaMesMap.get(c) ?? new Map();
    mm.set(ym(t.data!), (mm.get(ym(t.data!)) ?? 0) + abs(t.valor));
    contaMesMap.set(c, mm);
  }
  const topContas = [...totalConta.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30);
  const despesas_por_conta = topContas.map(([conta, total]) => ({
    conta,
    grupo: conta === A_CLASSIFICAR ? "A classificar" : nomeGrupo[conta] ?? "Outros",
    total: round(total),
    por_mes: Object.fromEntries(meses.map((m) => [m, round(contaMesMap.get(conta)?.get(m) ?? 0)])),
  }));

  // Despesas por grupo x mês
  const grupoMes = new Map<string, Map<string, number>>();
  for (const t of reais) {
    if (t.is_internal || t.tipo !== "DEBIT") continue;
    const conta = t.conta_nome ?? A_CLASSIFICAR;
    const g = conta === A_CLASSIFICAR ? "A classificar" : nomeGrupo[conta] ?? "Outros";
    const mm = grupoMes.get(g) ?? new Map();
    mm.set(ym(t.data!), (mm.get(ym(t.data!)) ?? 0) + abs(t.valor));
    grupoMes.set(g, mm);
  }
  const despesas_por_grupo = [...grupoMes.entries()].map(([grupo, mm]) => ({
    grupo,
    por_mes: Object.fromEntries(meses.map((m) => [m, round(mm.get(m) ?? 0)])),
  }));

  // Top fornecedores (despesas) — geral
  const forn = new Map<string, { nome: string; total: number; conta: string }>();
  for (const t of reais) {
    if (t.is_internal || t.tipo !== "DEBIT") continue;
    const nome = t.contraparte_nome || t.descricao || "(sem identificação)";
    const key = (t.contraparte_doc ?? "").replace(/\D/g, "") || "N:" + nome.toUpperCase().slice(0, 24);
    const e = forn.get(key) ?? { nome, total: 0, conta: t.conta_nome ?? A_CLASSIFICAR };
    e.total += abs(t.valor);
    forn.set(key, e);
  }
  const top_fornecedores = [...forn.values()]
    .map((f) => ({ nome: f.nome, conta: f.conta, total: round(f.total) }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 25);

  // Top pagadores (receitas) — geral
  const pag = new Map<string, { nome: string; total: number }>();
  for (const t of reais) {
    if (t.is_internal || t.tipo !== "CREDIT") continue;
    const nome = t.contraparte_nome || "(sem identificação)";
    const key = (t.contraparte_doc ?? "").replace(/\D/g, "") || "N:" + nome.toUpperCase();
    const e = pag.get(key) ?? { nome, total: 0 };
    e.total += abs(t.valor);
    pag.set(key, e);
  }
  const top_pagadores = [...pag.values()]
    .map((p) => ({ nome: p.nome, total: round(p.total) }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 15);

  let aClassQtd = 0,
    aClassTotal = 0;
  for (const t of reais) {
    if (t.is_internal) continue;
    if (t.conta_nome === A_CLASSIFICAR || t.classif_origem === "—") {
      aClassQtd++;
      aClassTotal += abs(t.valor);
    }
  }

  return {
    empresa: "Cliente do painel financeiro",
    moeda: "BRL (reais)",
    meses,
    saldo_por_conta: accounts.map((a) => ({
      banco: a.banco,
      tipo: a.subtipo || a.tipo,
      numero: a.numero,
      saldo: round(a.saldo ?? 0),
    })),
    evolucao_mensal: evolucao,
    despesas_por_conta,
    despesas_por_grupo,
    top_fornecedores,
    top_pagadores,
    a_classificar: { qtd: aClassQtd, total_brl: round(aClassTotal) },
  };
}

export const SYSTEM_CHAT = `Você é o analista financeiro virtual do painel, conversando com a diretoria do cliente dentro do painel financeiro.

Você recebe, no contexto, um JSON com os números do extrato bancário já categorizados (saldos, evolução mensal, despesas por conta e por grupo, fornecedores, pagadores). Responda perguntas sobre as finanças com base SOMENTE nesses dados.

REGRAS:
- Responda em português do Brasil, de forma direta e objetiva. Valores em reais (BRL), formatados (ex.: R$ 12.450).
- Use os números do contexto. NÃO invente valores, datas ou nomes. Se a informação não estiver no contexto, diga claramente que não tem esse dado no extrato.
- Quando fizer sentido, compare meses, aponte tendências, sugira onde economizar e sinalize riscos — sempre com os números.
- Seja conciso: vá direto ao ponto. Use listas curtas quando ajudar. Não exponha o JSON nem fale em "contexto"/"dados fornecidos" — fale como um analista.
- Os meses estão no formato AAAA-MM; ao responder, use o nome do mês (ex.: "maio/2026").`;
