import { config } from "./config";

const AUTH = config.autmais.authBase;
const MONGO = config.autmais.mongoBase;

function tenantHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    tenant: config.autmais.tenant,
    Accept: "application/json",
  };
}

/** Faz login na Autmais e devolve o accessToken (Bearer). */
export async function signin(): Promise<string> {
  const r = await fetch(`${AUTH}/auth/signin`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      username: config.autmais.user,
      password: config.autmais.pass,
    }),
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`Autmais signin falhou: HTTP ${r.status}`);
  const j = await r.json();
  if (!j?.accessToken) throw new Error("Autmais signin: accessToken ausente na resposta");
  return j.accessToken as string;
}

export type AutmaisAccount = {
  accountIdConnection: string;
  idCompanie: string;
  nameCompanie?: string;
  federalRegistration?: string;
  connectorNameBank?: string;
  typeAccount?: string;
  subtypeAccount?: string;
  numberAccount?: string;
  balanceAccount?: number;
  taxNumberAccount?: string;
};

/** Lista todas as contas bancárias do tenant. */
export async function listAccounts(token: string): Promise<AutmaisAccount[]> {
  const r = await fetch(
    `${AUTH}/integrattion_banks_accounts?_page=1&_limit=300`,
    { headers: tenantHeaders(token), cache: "no-store" }
  );
  if (!r.ok) throw new Error(`Autmais contas falhou: HTTP ${r.status}`);
  const j = await r.json();
  return Array.isArray(j) ? j : (j?.data ?? []);
}

export type AutmaisTx = {
  _id: string;
  type?: string; // DEBIT | CREDIT
  amount?: number;
  dateTransaction?: string;
  dateTransactionDateUtil?: string;
  description?: string;
  paymentDescription?: string;
  category?: string;
  categoryId?: string;
  paymentPayerName?: string;
  paymentPayerDocumentNumber?: string;
  paymentReceiverName?: string;
  paymentReceiverDocumentNumber?: string;
  merchantName?: string;
  merchantDocumentNumber?: string;
  merchantCnae?: string;
  accountId?: string;
  idCompanie?: string;
};

/** Puxa todas as transações de uma conta no período (paginado). */
export async function listTransactions(
  token: string,
  idCompanie: string,
  accountId: string,
  start: string,
  end: string
): Promise<AutmaisTx[]> {
  const out: AutmaisTx[] = [];
  for (let page = 1; page <= 60; page++) {
    const url =
      `${MONGO}/ib_transactions?_page=${page}&_limit=500` +
      `&idCompanie=${encodeURIComponent(idCompanie)}` +
      `&accountId=${encodeURIComponent(accountId)}` +
      `&typeTransaction=transaction` +
      `&dateTransactionStart=${start}&dateTransactionEnd=${end}&filterByDateUtil=1`;
    const r = await fetch(url, { headers: tenantHeaders(token), cache: "no-store" });
    if (!r.ok) break;
    const j = await r.json();
    const chunk: AutmaisTx[] = Array.isArray(j) ? j : (j?.data ?? []);
    out.push(...chunk);
    if (chunk.length < 500) break;
  }
  return out;
}
