import { getAnthropic, MODELO_IA } from "./anthropic";
import type { TxRow, Account } from "./queries";

const A_CLASSIFICAR = "A classificar / Outros";
const abs = (n: number | null) => Math.abs(n ?? 0);
const ym = (d: string) => d.slice(0, 7);
const round = (n: number) => Math.round(n);

/** Comentários do analista por parte do painel (chave do widget -> texto). */
export type Comentarios = Record<string, string>;

/** Chaves dos widgets que recebem comentário da IA. */
export const WIDGETS = [
  "resumo",
  "kpis",
  "donut",
  "maiores_gastos",
  "fluxo",
  "evolucao",
  "movers",
  "recorrentes",
  "heatmap",
  "tendencia",
  "top_pagadores",
] as const;

// ---------------------------------------------------------------------------
// Agregados determinísticos do mês em foco (a IA só interpreta estes números).
// ---------------------------------------------------------------------------
function montarDadosMes(
  txs: TxRow[],
  accounts: Account[],
  nomeGrupo: Record<string, string>,
  mesAlvo?: string
) {
  const reais = txs.filter((t) => t.data);
  const meses = [...new Set(reais.map((t) => ym(t.data!)))].sort();
  const mes = mesAlvo && meses.includes(mesAlvo) ? mesAlvo : meses[meses.length - 1] ?? null;
  const idx = mes ? meses.indexOf(mes) : -1;
  const mesAnterior = idx > 0 ? meses[idx - 1] : null;
  const ultimos = meses.slice(Math.max(0, meses.length - 6));
  const parcial = mes === new Date().toISOString().slice(0, 7);

  const somaMes = (m: string | null, tipo: "CREDIT" | "DEBIT") => {
    let s = 0;
    if (!m) return 0;
    for (const t of reais)
      if (!t.is_internal && t.tipo === tipo && ym(t.data!) === m) s += abs(t.valor);
    return round(s);
  };

  const evolucao = ultimos.map((m) => ({
    mes: m,
    receitas: somaMes(m, "CREDIT"),
    despesas: somaMes(m, "DEBIT"),
    resultado: somaMes(m, "CREDIT") - somaMes(m, "DEBIT"),
  }));

  const contaMes = (m: string | null) => {
    const out = new Map<string, number>();
    if (!m) return out;
    for (const t of reais) {
      if (t.is_internal || t.tipo !== "DEBIT" || ym(t.data!) !== m) continue;
      const c = t.conta_nome ?? A_CLASSIFICAR;
      out.set(c, (out.get(c) ?? 0) + abs(t.valor));
    }
    return out;
  };
  const atual = contaMes(mes);
  const anterior = contaMes(mesAnterior);
  const contas = new Set<string>([...atual.keys(), ...anterior.keys()]);
  const despesas_por_conta = [...contas]
    .filter((c) => c !== A_CLASSIFICAR)
    .map((conta) => {
      const a = round(atual.get(conta) ?? 0);
      const b = round(anterior.get(conta) ?? 0);
      return { conta, este_mes: a, mes_anterior: b, variacao_pct: b > 0 ? round(((a - b) / b) * 100) : a > 0 ? null : 0 };
    })
    .sort((x, y) => y.este_mes - x.este_mes)
    .slice(0, 15);

  // Despesas por grupo (donut/heatmap) do mês
  const grupoMes = new Map<string, number>();
  for (const t of reais) {
    if (t.is_internal || t.tipo !== "DEBIT" || ym(t.data!) !== mes) continue;
    const conta = t.conta_nome ?? A_CLASSIFICAR;
    const g = conta === A_CLASSIFICAR ? "A classificar" : nomeGrupo[conta] ?? "Outros";
    grupoMes.set(g, (grupoMes.get(g) ?? 0) + abs(t.valor));
  }
  const despesas_por_grupo = [...grupoMes.entries()]
    .map(([grupo, total]) => ({ grupo, total: round(total) }))
    .sort((a, b) => b.total - a.total);

  // Maior gasto individual do mês
  let maior_gasto: { nome: string; valor: number; conta: string } | null = null;
  for (const t of reais) {
    if (t.is_internal || t.tipo !== "DEBIT" || ym(t.data!) !== mes) continue;
    const v = abs(t.valor);
    if (!maior_gasto || v > maior_gasto.valor)
      maior_gasto = { nome: t.contraparte_nome || "(sem nome)", valor: round(v), conta: t.conta_nome ?? A_CLASSIFICAR };
  }

  // Recorrentes por conta (mês a mês) — espelha o "Radar de recorrentes"
  const recorrentes: { conta: string; media: number; este_mes: number; pago: boolean }[] = [];
  const todasContas = new Set<string>();
  for (const m of ultimos) for (const c of contaMes(m).keys()) if (c !== A_CLASSIFICAR) todasContas.add(c);
  const thr = Math.max(2, Math.ceil(ultimos.length / 2));
  for (const c of todasContas) {
    const serie = ultimos.map((m) => contaMes(m).get(c) ?? 0);
    const presentes = serie.filter((v) => v > 0);
    if (presentes.length < thr) continue;
    const media = round(presentes.reduce((s, v) => s + v, 0) / presentes.length);
    const esteMes = round(atual.get(c) ?? 0);
    recorrentes.push({ conta: c, media, este_mes: esteMes, pago: esteMes > 0 });
  }
  recorrentes.sort((a, b) => b.media - a.media);

  // Top pagadores (receitas) do mês
  const pag = new Map<string, { nome: string; total: number }>();
  for (const t of reais) {
    if (t.is_internal || t.tipo !== "CREDIT" || ym(t.data!) !== mes) continue;
    const nome = t.contraparte_nome || "(sem identificação)";
    const key = (t.contraparte_doc ?? "").replace(/\D/g, "") || "N:" + nome.toUpperCase();
    const e = pag.get(key) ?? { nome, total: 0 };
    e.total += abs(t.valor);
    pag.set(key, e);
  }
  const top_pagadores = [...pag.values()]
    .map((p) => ({ nome: p.nome, total: round(p.total) }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);

  // A classificar do mês
  let aClassQtd = 0,
    aClassTotal = 0;
  for (const t of reais) {
    if (t.is_internal || ym(t.data!) !== mes) continue;
    if (t.conta_nome === A_CLASSIFICAR || t.classif_origem === "—") {
      aClassQtd++;
      aClassTotal += abs(t.valor);
    }
  }

  const ev = evolucao.find((e) => e.mes === mes);
  return {
    mes,
    mes_anterior: mesAnterior,
    mes_parcial: parcial,
    saldo_total_contas: round(accounts.reduce((s, a) => s + (a.saldo ?? 0), 0)),
    receitas_mes: ev?.receitas ?? 0,
    despesas_mes: ev?.despesas ?? 0,
    resultado_mes: ev?.resultado ?? 0,
    a_classificar_mes: { qtd: aClassQtd, total_brl: round(aClassTotal) },
    evolucao_ultimos_meses: evolucao,
    despesas_por_conta_este_vs_anterior: despesas_por_conta,
    despesas_por_grupo,
    maior_gasto,
    recorrentes: recorrentes.slice(0, 15),
    top_pagadores,
  };
}

// ---------------------------------------------------------------------------
// Prompt + chamada à Claude (gera 1 comentário curto por widget)
// ---------------------------------------------------------------------------
const SYSTEM = `Você é o analista financeiro virtual do painel, comentando o painel da diretoria do cliente. Os dados vêm do extrato bancário das empresas do cliente, já categorizados.

Tarefa: para o MÊS EM FOCO, escreva um comentário CURTO (1 frase, no máximo 2) para cada parte do painel — como um analista que olha o gráfico/indicador e aponta o que importa para a decisão.

Cada chave do JSON de saída corresponde a uma parte do painel:
- "resumo": leitura geral do mês em 2 frases (o mais importante).
- "kpis": sobre receitas, despesas, resultado e saldo do mês.
- "donut": composição das despesas por grupo (onde o dinheiro foi).
- "maiores_gastos": as maiores contas de despesa do mês.
- "fluxo": como o caixa se comportou no mês (entrou mais ou menos que saiu).
- "evolucao": entradas × saídas nos últimos meses.
- "movers": contas que mais subiram/caíram vs o mês anterior.
- "recorrentes": contas recorrentes — pagas ou não, acima/abaixo da média.
- "heatmap": evolução dos gastos por grupo ao longo dos meses.
- "tendencia": tendência do resultado mês a mês.
- "top_pagadores": maiores pagadores (receitas) do mês.

REGRAS:
- Use SOMENTE os números do JSON (em reais, BRL). NÃO invente valores, datas ou nomes. Cite números concretos quando ajudar (ex.: "subiu de R$ 1.200 para R$ 1.680, +40%").
- Se "mes_parcial" for true, o mês ainda está em andamento — não trate quedas como tendência.
- Português do Brasil, tom objetivo e direto, voz de analista. Não repita o mesmo ponto em widgets diferentes.
- Se um widget tiver pouco dado, faça um comentário breve e honesto (ex.: "Poucos meses para concluir tendência.").`;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [...WIDGETS],
  properties: Object.fromEntries(WIDGETS.map((w) => [w, { type: "string" }])),
} as const;

export async function gerarComentarios(
  txs: TxRow[],
  accounts: Account[],
  nomeGrupo: Record<string, string>,
  mesAlvo?: string
) {
  const dados = montarDadosMes(txs, accounts, nomeGrupo, mesAlvo);
  if (!dados.mes) throw new Error("Sem dados para analisar.");

  const client = getAnthropic();
  const resp = await client.messages.create({
    model: MODELO_IA,
    max_tokens: 16000,
    thinking: { type: "adaptive" },
    system: SYSTEM,
    output_config: { format: { type: "json_schema", schema: SCHEMA } },
    messages: [
      {
        role: "user",
        content:
          `Comente o painel do mês ${dados.mes} com base nestes agregados (JSON):\n\n\`\`\`json\n` +
          JSON.stringify(dados) +
          "\n```",
      },
    ],
  });

  const texto = resp.content.find((b) => b.type === "text");
  if (!texto || texto.type !== "text") throw new Error("A IA não retornou conteúdo de texto.");
  const comentarios = JSON.parse(texto.text) as Comentarios;

  return {
    comentarios,
    mes: dados.mes,
    tokens_in: resp.usage.input_tokens,
    tokens_out: resp.usage.output_tokens,
  };
}
