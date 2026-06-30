// ============================================================================
// Dados fictícios EMBUTIDOS para a vitrine (modo demonstração).
// Em DEMO_MODE as leituras retornam estes fixtures — o painel roda SEM banco.
// Nada real aqui; a instância privada (sem DEMO_MODE) usa o PostgreSQL normal.
// ============================================================================
import type { TxRow, Company, Account } from "./queries";
import type { PlanoConta, RuleRow } from "./regras";
import type { Comentarios } from "./insights";

const C1 = "demo-c1",
  C2 = "demo-c2";
const A1 = "demo-a1",
  A2 = "demo-a2",
  A3 = "demo-a3";

export const demoCompanies: Company[] = [
  { id: C1, nome: "Aurora Comércio LTDA", cnpj: "12.345.678/0001-90" },
  { id: C2, nome: "Aurora Serviços ME", cnpj: "98.765.432/0001-10" },
];

export const demoAccounts: Account[] = [
  { id: A1, company_id: C1, banco: "Bradesco", tipo: "Conta Corrente", subtipo: "Conta Corrente", numero: "0001-1", saldo: 142850.4 },
  { id: A2, company_id: C1, banco: "Itaú", tipo: "Conta Corrente", subtipo: "Conta Corrente", numero: "0002-2", saldo: 68420.15 },
  { id: A3, company_id: C2, banco: "Bradesco", tipo: "Conta Corrente", subtipo: "Conta Corrente", numero: "0003-3", saldo: 41260 },
];

const PLANO: Array<[string, string, string]> = [
  ["3.1", "Receita de Vendas", "Receitas"],
  ["3.2", "Receita de Serviços", "Receitas"],
  ["4.1", "Salários", "Despesas com Pessoal"],
  ["4.2", "Pró-labore", "Despesas com Pessoal"],
  ["4.3", "Aluguel", "Despesas Operacionais"],
  ["4.4", "Energia Elétrica", "Despesas Operacionais"],
  ["4.5", "Impostos (Simples Nacional)", "Impostos"],
  ["4.6", "Software / Assinaturas", "Despesas com TI"],
  ["4.7", "Tarifas Bancárias", "Despesas Financeiras"],
  ["4.8", "Fornecedores", "Custos"],
  ["4.9", "Marketing", "Despesas Comerciais"],
];

export const demoNomeGrupo: Record<string, string> = Object.fromEntries(
  PLANO.map(([, nome, grupo]) => [nome, grupo])
);

export const demoPlanoContas: PlanoConta[] = PLANO.map(([codigo, nome]) => ({
  codigo,
  nome,
  label: `${codigo} — ${nome}`,
}));

export const demoRules: RuleRow[] = [
  { id: "r1", tipo_match: "categoria", valor_match: "SALARY", conta_codigo: "4.1", conta_nome: "Salários", prioridade: 10, ativo: true },
  { id: "r2", tipo_match: "palavra", valor_match: "ALUGUEL|IMOBILIARIA", conta_codigo: "4.3", conta_nome: "Aluguel", prioridade: 20, ativo: true },
  { id: "r3", tipo_match: "palavra", valor_match: "ENEL|ENERGISA|ENERGIA", conta_codigo: "4.4", conta_nome: "Energia Elétrica", prioridade: 20, ativo: true },
  { id: "r4", tipo_match: "palavra", valor_match: "DAS|SIMPLES|RECEITA FEDERAL", conta_codigo: "4.5", conta_nome: "Impostos (Simples Nacional)", prioridade: 20, ativo: true },
  { id: "r5", tipo_match: "palavra", valor_match: "SOFTWARE|SAAS|ASSINATURA", conta_codigo: "4.6", conta_nome: "Software / Assinaturas", prioridade: 20, ativo: true },
];

// tipo, descrição, contraparte, código, nome da conta, valor-base
type Modelo = [string, string, string, string, string, number];
const MODELOS: Modelo[] = [
  ["CREDIT", "Recebimento de vendas", "Clientes diversos", "3.1", "Receita de Vendas", 82000],
  ["CREDIT", "Contratos de serviço", "Contratos de serviço", "3.2", "Receita de Serviços", 38000],
  ["DEBIT", "Folha de pagamento", "Folha de Pagamento", "4.1", "Salários", 27000],
  ["DEBIT", "Pró-labore sócios", "Sócios", "4.2", "Pró-labore", 12000],
  ["DEBIT", "Aluguel do imóvel", "Imobiliária Central", "4.3", "Aluguel", 6500],
  ["DEBIT", "Conta de energia", "Enel Distribuição", "4.4", "Energia Elétrica", 1800],
  ["DEBIT", "DAS - Simples Nacional", "Receita Federal", "4.5", "Impostos (Simples Nacional)", 9200],
  ["DEBIT", "Assinatura de software", "Software SaaS Ltda", "4.6", "Software / Assinaturas", 2400],
  ["DEBIT", "Tarifas bancárias", "Tarifa Bancária", "4.7", "Tarifas Bancárias", 320],
  ["DEBIT", "Compra de fornecedores", "Distribuidora XYZ", "4.8", "Fornecedores", 13000],
  ["DEBIT", "Campanha de marketing", "Agência Web", "4.9", "Marketing", 3000],
];
const MESES = ["2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06"];
const REC_F = [0.86, 0.92, 0.97, 1.03, 1.1, 1.18]; // receitas crescendo
const DESP_F = [1.0, 0.98, 1.01, 0.99, 1.0, 0.98]; // despesas estáveis

export const demoTransactions: TxRow[] = (() => {
  const out: TxRow[] = [];
  for (let mi = 0; mi < MESES.length; mi++) {
    for (let k = 0; k < MODELOS.length; k++) {
      const [tipo, desc, cp, code, name, base] = MODELOS[k];
      const f = tipo === "CREDIT" ? REC_F[mi] : DESP_F[mi];
      const vary = 0.96 + ((k * 7 + mi * 5) % 9) * 0.01; // variação determinística ~±4%
      const valor = Math.round(base * f * vary * 100) / 100;
      const account_id = [A1, A2, A3][k % 3];
      const company_id = account_id === A3 ? C2 : C1;
      const dia = String(3 + ((k * 2 + mi) % 25)).padStart(2, "0");
      out.push({
        id: `demo-${mi}-${k}`,
        data: `${MESES[mi]}-${dia}`,
        tipo,
        valor,
        descricao: desc,
        contraparte_nome: cp,
        contraparte_doc: null,
        categoria_autmais: null,
        conta_codigo: code,
        conta_nome: name,
        classif_origem: "regra (demo)",
        classif_confianca: "Alta",
        is_internal: false,
        company_id,
        account_id,
      });
    }
  }
  return out;
})();

const COMENT: Comentarios = {
  resumo: "Mês positivo: receitas em alta e despesas estáveis, com resultado de ~R$ 65 mil (margem ~46%). Caixa saudável, com folga de ~3 meses.",
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

export const demoComentarios: Record<string, { payload: Comentarios; gerado_em: string }> =
  Object.fromEntries(MESES.map((m) => [m, { payload: COMENT, gerado_em: "2026-06-30T12:00:00Z" }]));
