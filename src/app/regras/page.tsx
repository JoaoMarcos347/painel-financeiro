import { fetchAllTransactions, type TxRow } from "@/lib/queries";
import { getPlanoContas, getRules, aClassificarAgrupado } from "@/lib/regras";
import { PageHeader, Card } from "@/components/cards";
import { RegrasManager } from "@/components/RegrasManager";

export const dynamic = "force-dynamic";

export default async function Page() {
  let txs: TxRow[] = [];
  let contas: Awaited<ReturnType<typeof getPlanoContas>> = [];
  let rules: Awaited<ReturnType<typeof getRules>> = [];
  let erro: string | null = null;
  try {
    [txs, contas, rules] = await Promise.all([
      fetchAllTransactions(),
      getPlanoContas(),
      getRules(),
    ]);
  } catch (e) {
    erro = e instanceof Error ? e.message : String(e);
  }

  if (erro) {
    return (
      <>
        <PageHeader titulo="Regras / DE-PARA" />
        <Card className="border-amber-300 bg-amber-50">
          <p className="text-sm text-amber-700">{erro}</p>
        </Card>
      </>
    );
  }

  const pendencias = aClassificarAgrupado(txs);

  return (
    <>
      <PageHeader titulo="Regras / DE-PARA" />
      <RegrasManager pendencias={pendencias} contas={contas} rules={rules} />
    </>
  );
}
