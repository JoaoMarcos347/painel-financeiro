// ============================================================================
// Seed de DADOS FICTÍCIOS para o modo demonstração (vitrine / propaganda).
// Popula o banco com empresas, contas, plano de contas, regras e ~6 meses de
// lançamentos inventados — nada de dados reais.
//
// ⚠️  Ele LIMPA as tabelas antes de inserir. NÃO rode num banco com dados reais.
// Uso:  node scripts/seed-demo.mjs       (lê DATABASE_URL do ambiente ou do .env.local)
// ============================================================================
import { readFileSync } from "node:fs";
import pg from "pg";
const { Pool } = pg;

// Carrega DATABASE_URL do .env.local se não vier do ambiente.
if (!process.env.DATABASE_URL) {
  try {
    const txt = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
    for (const line of txt.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
    }
  } catch {}
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("✗ DATABASE_URL não definido (configure no .env.local).");
  process.exit(1);
}
const isLocal = /localhost|127\.0\.0\.1/.test(url);
const pool = new Pool({ connectionString: url, ssl: isLocal ? undefined : { rejectUnauthorized: false } });

// --- Plano de contas (balancete) -------------------------------------------
const PLANO = [
  ["3.1", "Receita de Vendas", "Receitas", 1],
  ["3.2", "Receita de Serviços", "Receitas", 2],
  ["4.1", "Salários", "Despesas com Pessoal", 10],
  ["4.2", "Pró-labore", "Despesas com Pessoal", 11],
  ["4.3", "Aluguel", "Despesas Operacionais", 20],
  ["4.4", "Energia Elétrica", "Despesas Operacionais", 21],
  ["4.5", "Impostos (Simples Nacional)", "Impostos", 30],
  ["4.6", "Software / Assinaturas", "Despesas com TI", 40],
  ["4.7", "Tarifas Bancárias", "Despesas Financeiras", 50],
  ["4.8", "Fornecedores", "Custos", 60],
  ["4.9", "Marketing", "Despesas Comerciais", 70],
];

// --- Regras de classificação (DE-PARA) -------------------------------------
const REGRAS = [
  ["category", "SALARY", "4.1", "Salários", 10],
  ["keyword", "ALUGUEL|IMOBILIARIA", "4.3", "Aluguel", 20],
  ["keyword", "ENEL|ENERGISA|CEMIG|ENERGIA", "4.4", "Energia Elétrica", 20],
  ["keyword", "DAS|SIMPLES|RECEITA FEDERAL", "4.5", "Impostos (Simples Nacional)", 20],
  ["keyword", "SOFTWARE|SAAS|ASSINATURA", "4.6", "Software / Assinaturas", 20],
];

// --- Modelos de lançamento recorrentes (por mês) ---------------------------
// tipo, descrição, contraparte, código, nome, valor-base
const MODELOS = [
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
const REC_FATOR = [0.86, 0.92, 0.97, 1.03, 1.10, 1.18];  // receitas crescendo (tendência saudável)
const DESP_FATOR = [1.0, 0.98, 1.01, 0.99, 1.0, 0.98];   // despesas estáveis

async function main() {
  console.log(isLocal ? "→ banco local" : "→ banco remoto (SSL)");
  await pool.query(
    `truncate transactions, accounts, rules, chart_of_accounts, insights_cache, sync_logs, companies restart identity cascade`
  );

  // Empresas
  const c1 = (await pool.query(
    `insert into companies (autmais_company_id, name, cnpj) values ($1,$2,$3) returning id`,
    ["demo-c1", "Aurora Comércio LTDA", "12.345.678/0001-90"]
  )).rows[0].id;
  const c2 = (await pool.query(
    `insert into companies (autmais_company_id, name, cnpj) values ($1,$2,$3) returning id`,
    ["demo-c2", "Aurora Serviços ME", "98.765.432/0001-10"]
  )).rows[0].id;

  // Contas
  const accs = [];
  const accDefs = [
    ["demo-a1", c1, "Bradesco", "Conta Corrente", "0001-1", 142850.4],
    ["demo-a2", c1, "Itaú", "Conta Corrente", "0002-2", 68420.15],
    ["demo-a3", c2, "Bradesco", "Conta Corrente", "0003-3", 41260.0],
  ];
  for (const [conn, comp, bank, type, num, bal] of accDefs) {
    const id = (await pool.query(
      `insert into accounts (autmais_connection_id, company_id, bank, type, subtype, number, balance)
       values ($1,$2,$3,$4,$4,$5,$6) returning id`,
      [conn, comp, bank, type, num, bal]
    )).rows[0].id;
    accs.push({ id, company: comp });
  }

  // Plano de contas
  for (const [code, name, group, sort] of PLANO)
    await pool.query(
      `insert into chart_of_accounts (code, name, group_name, sort_order) values ($1,$2,$3,$4)`,
      [code, name, group, sort]
    );

  // Regras
  for (const [mt, mv, code, name, prio] of REGRAS)
    await pool.query(
      `insert into rules (match_type, match_value, account_code, account_name, priority) values ($1,$2,$3,$4,$5)`,
      [mt, mv, code, name, prio]
    );

  // Lançamentos (6 meses × modelos), distribuídos entre as contas
  let n = 0;
  for (let mi = 0; mi < MESES.length; mi++) {
    const ym = MESES[mi];
    for (let k = 0; k < MODELOS.length; k++) {
      const [type, desc, cp, code, name, base] = MODELOS[k];
      const acc = accs[k % accs.length];
      const dia = String(2 + Math.floor(Math.random() * 26)).padStart(2, "0");
      const f = type === "CREDIT" ? REC_FATOR[mi] : DESP_FATOR[mi];
      const valor = Math.round(base * f * (0.94 + Math.random() * 0.12) * 100) / 100;
      await pool.query(
        `insert into transactions
           (autmais_id, account_id, company_id, date, datetime, type, amount, description,
            counterparty_name, account_code, account_name, classification_source,
            classification_confidence, is_internal)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'regra (demo)','Alta',false)`,
        [
          `demo-${ym}-${k}`, acc.id, acc.company, `${ym}-${dia}`, `${ym}-${dia}T12:00:00Z`,
          type, valor, desc, cp, code, name,
        ]
      );
      n++;
    }
  }

  console.log(`✓ Seed concluído: 2 empresas, ${accs.length} contas, ${PLANO.length} contas do plano, ${REGRAS.length} regras, ${n} lançamentos.`);
  await pool.end();
}

main().catch((e) => {
  console.error("✗ Erro no seed:", e.message);
  process.exit(1);
});
