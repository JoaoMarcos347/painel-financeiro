import { query } from "./db";

export type TxRow = {
  id: string;
  data: string | null;
  tipo: string | null; // DEBIT | CREDIT
  valor: number | null;
  descricao: string | null;
  contraparte_nome: string | null;
  contraparte_doc: string | null;
  categoria_autmais: string | null;
  conta_codigo: string | null;
  conta_nome: string | null;
  classif_origem: string | null;
  classif_confianca: string | null;
  is_internal: boolean;
  company_id: string | null;
  account_id: string | null;
};

export type Company = { id: string; nome: string | null; cnpj: string | null };
export type Account = {
  id: string;
  company_id: string | null;
  banco: string | null;
  tipo: string | null;
  subtipo: string | null;
  numero: string | null;
  saldo: number | null;
};

const A_CLASSIFICAR = "A classificar / Outros";

// Cache em memória (por instância) das transações — evita reler a tabela inteira
// a cada carregamento de página / mensagem de chat. TTL curto; o sync invalida.
let _txCache: { at: number; data: TxRow[] } | null = null;
const TX_TTL_MS = 60_000;

/** Limpa o cache de transações (chamar após um sync gravar dados novos). */
export function invalidateTxCache() {
  _txCache = null;
}

// ── Leituras (PostgreSQL). As colunas vêm em inglês e são renomeadas (as) ──
// ── de volta pro português, pra o resto do código continuar igual.        ──

export async function fetchAllTransactions(): Promise<TxRow[]> {
  if (_txCache && Date.now() - _txCache.at < TX_TTL_MS) return _txCache.data;
  const data = await query<TxRow>(
    `select id,
            to_char(date, 'YYYY-MM-DD') as data,
            type as tipo,
            amount::float8 as valor,
            description as descricao,
            counterparty_name as contraparte_nome,
            counterparty_doc as contraparte_doc,
            autmais_category as categoria_autmais,
            account_code as conta_codigo,
            account_name as conta_nome,
            classification_source as classif_origem,
            classification_confidence as classif_confianca,
            is_internal,
            company_id,
            account_id
       from transactions
      order by date asc`
  );
  _txCache = { at: Date.now(), data };
  return data;
}

export async function getCompanies(): Promise<Company[]> {
  return query<Company>(`select id, name as nome, cnpj from companies`);
}

export async function getAccounts(): Promise<Account[]> {
  return query<Account>(
    `select id, company_id, bank as banco, type as tipo, subtype as subtipo,
            number as numero, balance::float8 as saldo
       from accounts`
  );
}

type SyncRow = {
  inicio: string | null;
  fim: string | null;
  qtd_transacoes: number | null;
  qtd_contas: number | null;
  status: string | null;
  erro: string | null;
};

export async function getUltimaSync(): Promise<SyncRow | null> {
  const rows = await query<SyncRow>(
    `select started_at::text as inicio, finished_at::text as fim,
            transactions_count as qtd_transacoes, accounts_count as qtd_contas,
            status, error as erro
       from sync_logs
      order by started_at desc
      limit 1`
  );
  return rows[0] ?? null;
}

/** Comentários do analista (IA) por mês: { "2026-05": { resumo, donut, ... } } */
export async function getComentariosPorMes(): Promise<
  Record<string, { payload: import("./insights").Comentarios; gerado_em: string }>
> {
  const rows = await query<{ id: string; payload: import("./insights").Comentarios; gerado_em: string }>(
    `select id, content as payload, generated_at::text as gerado_em from insights_cache`
  );
  const out: Record<string, { payload: import("./insights").Comentarios; gerado_em: string }> = {};
  for (const r of rows) out[r.id] = { payload: r.payload, gerado_em: r.gerado_em };
  return out;
}

const abs = (n: number | null) => Math.abs(n ?? 0);

export function resumo(txs: TxRow[]) {
  let receitas = 0,
    despesas = 0,
    internas = 0,
    classificadas = 0,
    aClassificar = 0;
  for (const t of txs) {
    if (t.is_internal) {
      internas += abs(t.valor);
      classificadas++;
      continue;
    }
    if (t.tipo === "CREDIT") receitas += abs(t.valor);
    else if (t.tipo === "DEBIT") despesas += abs(t.valor);
    if (t.conta_nome === A_CLASSIFICAR || t.classif_origem === "—") aClassificar++;
    else classificadas++;
  }
  return {
    receitas,
    despesas,
    resultado: receitas - despesas,
    internas,
    total: txs.length,
    classificadas,
    aClassificar,
    pctClassificado: txs.length ? Math.round((classificadas / txs.length) * 100) : 0,
  };
}

export function evolucaoMensal(txs: TxRow[]) {
  const m = new Map<string, { mes: string; entradas: number; saidas: number }>();
  for (const t of txs) {
    if (t.is_internal || !t.data) continue;
    const ym = t.data.slice(0, 7);
    const e = m.get(ym) ?? { mes: ym, entradas: 0, saidas: 0 };
    if (t.tipo === "CREDIT") e.entradas += abs(t.valor);
    else if (t.tipo === "DEBIT") e.saidas += abs(t.valor);
    m.set(ym, e);
  }
  return [...m.values()].sort((a, b) => a.mes.localeCompare(b.mes));
}

export function despesasPorConta(txs: TxRow[], topN = 12) {
  const m = new Map<string, number>();
  for (const t of txs) {
    if (t.is_internal || t.tipo !== "DEBIT") continue;
    const nome = t.conta_nome ?? A_CLASSIFICAR;
    m.set(nome, (m.get(nome) ?? 0) + abs(t.valor));
  }
  return [...m.entries()]
    .map(([conta, total]) => ({ conta, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, topN);
}

export function comparativoEmpresas(txs: TxRow[], companies: Company[]) {
  const nameById = new Map(companies.map((c) => [c.id, c.nome ?? "—"]));
  const m = new Map<string, { empresa: string; receitas: number; despesas: number }>();
  for (const t of txs) {
    if (t.is_internal) continue;
    const nome = nameById.get(t.company_id ?? "") ?? "—";
    const e = m.get(nome) ?? { empresa: nome, receitas: 0, despesas: 0 };
    if (t.tipo === "CREDIT") e.receitas += abs(t.valor);
    else if (t.tipo === "DEBIT") e.despesas += abs(t.valor);
    m.set(nome, e);
  }
  return [...m.values()];
}

/** Balancete gerencial: conta (linha) x mês (coluna), valor = saídas - entradas por padrão de despesa. */
export function balancete(txs: TxRow[]) {
  const meses = new Set<string>();
  const linhas = new Map<
    string,
    { conta: string; grupo: "Receita" | "Despesa" | "Interna"; porMes: Map<string, number>; total: number }
  >();
  for (const t of txs) {
    if (!t.data) continue;
    const ym = t.data.slice(0, 7);
    meses.add(ym);
    const grupo: "Receita" | "Despesa" | "Interna" = t.is_internal
      ? "Interna"
      : t.tipo === "CREDIT"
      ? "Receita"
      : "Despesa";
    const conta = t.is_internal ? "Transferência interna" : t.conta_nome ?? A_CLASSIFICAR;
    const key = `${grupo}|${conta}`;
    const linha =
      linhas.get(key) ?? { conta, grupo, porMes: new Map<string, number>(), total: 0 };
    linha.porMes.set(ym, (linha.porMes.get(ym) ?? 0) + abs(t.valor));
    linha.total += abs(t.valor);
    linhas.set(key, linha);
  }
  const mesesArr = [...meses].sort();
  const linhasArr = [...linhas.values()].sort((a, b) => b.total - a.total);
  return { meses: mesesArr, linhas: linhasArr };
}

/** Despesas (não internas) agrupadas por mês -> conta -> total. */
export function despesasPorMesConta(txs: TxRow[]): Record<string, Record<string, number>> {
  const out: Record<string, Record<string, number>> = {};
  for (const t of txs) {
    if (t.is_internal || t.tipo !== "DEBIT" || !t.data) continue;
    const ym = t.data.slice(0, 7);
    const conta = t.conta_nome ?? A_CLASSIFICAR;
    (out[ym] ??= {})[conta] = (out[ym]?.[conta] ?? 0) + abs(t.valor);
  }
  return out;
}

/** Mapa nome da conta -> grupo do balancete (a partir do plano de contas). */
export async function getNomeGrupo(): Promise<Record<string, string>> {
  const rows = await query<{ nome: string; grupo: string | null }>(
    `select name as nome, group_name as grupo from chart_of_accounts`
  );
  const m: Record<string, string> = {};
  for (const r of rows) {
    if (r.nome && !(r.nome in m)) m[r.nome] = r.grupo || "Outros";
  }
  return m;
}

/** Despesas por mês -> grupo (para donut e heatmap). */
export function despesasPorMesGrupo(
  txs: TxRow[],
  nomeGrupo: Record<string, string>
): Record<string, Record<string, number>> {
  const out: Record<string, Record<string, number>> = {};
  for (const t of txs) {
    if (t.is_internal || t.tipo !== "DEBIT" || !t.data) continue;
    const ym = t.data.slice(0, 7);
    const conta = t.conta_nome ?? A_CLASSIFICAR;
    const grupo = conta === A_CLASSIFICAR ? "A classificar" : nomeGrupo[conta] ?? "Outros";
    (out[ym] ??= {})[grupo] = (out[ym]?.[grupo] ?? 0) + abs(t.valor);
  }
  return out;
}

/** Fluxo líquido por mês -> dia (entradas − saídas), não internas. */
export function fluxoDiarioPorMes(txs: TxRow[]): Record<string, Record<string, number>> {
  const out: Record<string, Record<string, number>> = {};
  for (const t of txs) {
    if (t.is_internal || !t.data) continue;
    const ym = t.data.slice(0, 7);
    const dia = t.data.slice(8, 10);
    const v = abs(t.valor) * (t.tipo === "CREDIT" ? 1 : -1);
    (out[ym] ??= {})[dia] = (out[ym]?.[dia] ?? 0) + v;
  }
  return out;
}

/** Top pagadores (receitas) por mês. */
export function receitasTopPorMes(
  txs: TxRow[],
  topN = 8
): Record<string, { nome: string; total: number }[]> {
  const tmp: Record<string, Record<string, { nome: string; total: number }>> = {};
  for (const t of txs) {
    if (t.is_internal || t.tipo !== "CREDIT" || !t.data) continue;
    const ym = t.data.slice(0, 7);
    const nome = t.contraparte_nome || "(sem identificação)";
    const key = (t.contraparte_doc ?? "").replace(/\D/g, "") || "N:" + nome.toUpperCase();
    const bucket = (tmp[ym] ??= {});
    const e = bucket[key] ?? { nome, total: 0 };
    e.total += abs(t.valor);
    bucket[key] = e;
  }
  const out: Record<string, { nome: string; total: number }[]> = {};
  for (const ym of Object.keys(tmp))
    out[ym] = Object.values(tmp[ym]).sort((a, b) => b.total - a.total).slice(0, topN);
  return out;
}

/** Maior gasto individual por mês. */
export function maiorGastoPorMes(
  txs: TxRow[]
): Record<string, { nome: string; valor: number; conta: string }> {
  const out: Record<string, { nome: string; valor: number; conta: string }> = {};
  for (const t of txs) {
    if (t.is_internal || t.tipo !== "DEBIT" || !t.data) continue;
    const ym = t.data.slice(0, 7);
    const v = abs(t.valor);
    if (!out[ym] || v > out[ym].valor)
      out[ym] = {
        nome: t.contraparte_nome || "(sem nome)",
        valor: v,
        conta: t.conta_nome ?? A_CLASSIFICAR,
      };
  }
  return out;
}
