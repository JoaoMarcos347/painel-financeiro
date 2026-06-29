import { fetchAllTransactions, getCompanies, type TxRow, type Company } from "@/lib/queries";
import { PageHeader } from "@/components/cards";
import { TransacoesTable } from "@/components/TransacoesTable";

export const revalidate = 300; // ISR: abre instantâneo; invalidado no sync/reclassify

export default async function Page() {
  let txs: TxRow[] = [];
  let companies: Company[] = [];
  try {
    [txs, companies] = await Promise.all([fetchAllTransactions(), getCompanies()]);
  } catch (e) {
    // stale-if-error: re-lança p/ o ISR manter a última versão boa se o banco oscilar.
    throw e instanceof Error ? e : new Error(typeof e === "string" ? e : JSON.stringify(e));
  }

  const nameById = Object.fromEntries(companies.map((c) => [c.id, c.nome ?? "—"]));
  // Mais recentes primeiro
  const ordered = [...txs].sort((a, b) => (b.data ?? "").localeCompare(a.data ?? ""));

  return (
    <>
      <PageHeader titulo="Transações" />
      <TransacoesTable rows={ordered} nameById={nameById} />
    </>
  );
}
