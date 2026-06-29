import { query } from "./db";
import { signin, listAccounts, listTransactions } from "./autmais";
import { classify, counterpartyName, counterpartyDoc, type Rule } from "./categorize";
import { invalidateTxCache } from "./queries";
import { config } from "./config";

/** Sincroniza contas + transações da Autmais para o Postgres, no período dado. */
export async function runSync(
  start: string,
  end: string
): Promise<{ contas: number; transacoes: number }> {
  const docAlvo = config.painel.empresaDoc;
  const soDigitos = (s?: string | null) => (s ?? "").replace(/\D/g, "");

  // Log "rodando" e pega o id
  const logRows = await query<{ id: string }>(
    `insert into sync_logs (status) values ('rodando') returning id`
  );
  const logId = logRows[0]?.id;

  try {
    const token = await signin();
    if (!docAlvo) throw new Error("PAINEL_EMPRESA_DOC não configurado (CPF/CNPJ da empresa-alvo).");
    const all = await listAccounts(token);
    // Filtra as contas da empresa-alvo pelo documento (CPF/CNPJ).
    const accounts = all.filter((a) =>
      [a.federalRegistration, a.taxNumberAccount].some((d) => soDigitos(d) === docAlvo)
    );
    if (!accounts.length) throw new Error(`Nenhuma conta para o documento ${docAlvo}.`);

    // Empresas (upsert por autmais_company_id)
    const compMap = new Map<string, { nome?: string; cnpj?: string }>();
    for (const a of accounts)
      if (!compMap.has(a.idCompanie))
        compMap.set(a.idCompanie, { nome: a.nameCompanie, cnpj: a.federalRegistration });
    const compIdByAutmais = new Map<string, string>();
    for (const [id, v] of compMap) {
      const r = await query<{ id: string }>(
        `insert into companies (autmais_company_id, name, cnpj) values ($1,$2,$3)
         on conflict (autmais_company_id) do update set name = excluded.name, cnpj = excluded.cnpj
         returning id`,
        [id, v.nome ?? null, v.cnpj ?? null]
      );
      compIdByAutmais.set(id, r[0].id);
    }

    // Contas (upsert por autmais_connection_id)
    const accIdByConn = new Map<string, string>();
    for (const a of accounts) {
      const r = await query<{ id: string }>(
        `insert into accounts
           (autmais_connection_id, company_id, bank, type, subtype, number, balance, updated_at)
         values ($1,$2,$3,$4,$5,$6,$7, now())
         on conflict (autmais_connection_id) do update set
           company_id = excluded.company_id, bank = excluded.bank, type = excluded.type,
           subtype = excluded.subtype, number = excluded.number, balance = excluded.balance,
           updated_at = now()
         returning id`,
        [
          a.accountIdConnection,
          compIdByAutmais.get(a.idCompanie) ?? null,
          a.connectorNameBank ?? null,
          a.typeAccount ?? null,
          a.subtypeAccount ?? null,
          a.numberAccount ?? null,
          a.balanceAccount ?? null,
        ]
      );
      accIdByConn.set(a.accountIdConnection, r[0].id);
    }

    // Documentos próprios (p/ detectar transferência interna)
    const ownDocs = new Set<string>();
    for (const a of accounts)
      for (const d of [a.federalRegistration, a.taxNumberAccount]) {
        const dd = (d ?? "").replace(/\D/g, "");
        if (dd.length >= 11) ownDocs.add(dd);
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

    // Transações (upsert por autmais_id)
    let total = 0;
    for (const a of accounts) {
      const txs = await listTransactions(token, a.idCompanie, a.accountIdConnection, start, end);
      if (!txs.length) continue;
      for (const t of txs) {
        const c = classify(t, rules, ownDocs);
        const d = (t.dateTransaction ?? "").slice(0, 10);
        await query(
          `insert into transactions
             (autmais_id, account_id, company_id, date, datetime, type, amount, description,
              counterparty_name, counterparty_doc, merchant_name, merchant_doc, merchant_cnae,
              autmais_category, account_code, account_name, classification_source,
              classification_confidence, is_internal, raw)
           values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
           on conflict (autmais_id) do update set
             account_id=excluded.account_id, company_id=excluded.company_id, date=excluded.date,
             datetime=excluded.datetime, type=excluded.type, amount=excluded.amount,
             description=excluded.description, counterparty_name=excluded.counterparty_name,
             counterparty_doc=excluded.counterparty_doc, merchant_name=excluded.merchant_name,
             merchant_doc=excluded.merchant_doc, merchant_cnae=excluded.merchant_cnae,
             autmais_category=excluded.autmais_category, account_code=excluded.account_code,
             account_name=excluded.account_name, classification_source=excluded.classification_source,
             classification_confidence=excluded.classification_confidence,
             is_internal=excluded.is_internal, raw=excluded.raw`,
          [
            t._id,
            accIdByConn.get(a.accountIdConnection) ?? null,
            compIdByAutmais.get(a.idCompanie) ?? null,
            d || null,
            t.dateTransaction ?? null,
            t.type ?? null,
            t.amount ?? null,
            t.description ?? null,
            counterpartyName(t) || null,
            counterpartyDoc(t) || null,
            t.merchantName ?? null,
            t.merchantDocumentNumber ?? null,
            t.merchantCnae ?? null,
            t.category ?? null,
            c.conta_codigo,
            c.conta_nome,
            c.origem,
            c.confianca,
            c.is_internal,
            JSON.stringify(t),
          ]
        );
        total++;
      }
    }

    await query(
      `update sync_logs set finished_at = now(), accounts_count = $1, transactions_count = $2,
              status = 'ok' where id = $3`,
      [accounts.length, total, logId]
    );

    invalidateTxCache(); // dados novos → limpa o cache pra refletir no dashboard
    return { contas: accounts.length, transacoes: total };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (logId)
      await query(
        `update sync_logs set finished_at = now(), status = 'erro', error = $1 where id = $2`,
        [msg, logId]
      );
    throw e;
  }
}
