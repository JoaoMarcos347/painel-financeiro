import {
  fetchAllTransactions,
  getAccounts,
  getUltimaSync,
  getNomeGrupo,
  getComentariosPorMes,
  resumo,
  evolucaoMensal,
  despesasPorMesConta,
  despesasPorMesGrupo,
  fluxoDiarioPorMes,
  receitasTopPorMes,
  maiorGastoPorMes,
  type TxRow,
  type Account,
} from "@/lib/queries";
import { Card, PageHeader } from "@/components/cards";
import { SyncButton } from "@/components/SyncButton";
import { DashboardMensal } from "@/components/DashboardMensal";

// Página cacheada (ISR): abre instantânea; regenera a cada 5 min ou quando há
// sync/análise/reclassificação (revalidatePath nas rotas de mutação).
export const revalidate = 300;

export default async function Page() {
  let txs: TxRow[] = [];
  let accounts: Account[] = [];
  let sync: Awaited<ReturnType<typeof getUltimaSync>> = null;
  let nomeGrupo: Record<string, string> = {};
  let comentarios: Awaited<ReturnType<typeof getComentariosPorMes>> = {};

  try {
    [txs, accounts, sync, nomeGrupo, comentarios] = await Promise.all([
      fetchAllTransactions(),
      getAccounts(),
      getUltimaSync(),
      getNomeGrupo(),
      getComentariosPorMes(),
    ]);
  } catch (e) {
    // Não cacheia erro: re-lança para o ISR seguir servindo a última versão boa
    // do painel (stale-if-error) se o banco oscilar.
    throw e instanceof Error ? e : new Error(typeof e === "string" ? e : JSON.stringify(e));
  }

  const r = resumo(txs);
  const saldoTotal = accounts.reduce((s, a) => s + (a.saldo ?? 0), 0);

  return (
    <>
      <PageHeader titulo="Visão Geral">
        <SyncButton />
      </PageHeader>

      {txs.length === 0 ? (
        <Card>
          <div className="py-8 text-center">
            <div className="text-lg font-medium text-slate-700">Nenhuma transação ainda</div>
            <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
              Clique em <strong>Sincronizar</strong> acima para puxar o extrato da Autmais e
              montar o balancete.
            </p>
          </div>
        </Card>
      ) : (
        <DashboardMensal
          evo={evolucaoMensal(txs)}
          porMesConta={despesasPorMesConta(txs)}
          porMesGrupo={despesasPorMesGrupo(txs, nomeGrupo)}
          fluxoDiario={fluxoDiarioPorMes(txs)}
          receitasTop={receitasTopPorMes(txs)}
          maiorGasto={maiorGastoPorMes(txs)}
          comentarios={comentarios}
          saldoTotal={saldoTotal}
          pctClassificado={r.pctClassificado}
          aClassificar={r.aClassificar}
          totalTx={r.total}
          ultimaSync={sync?.fim ?? null}
        />
      )}
    </>
  );
}
