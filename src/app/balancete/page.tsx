import { fetchAllTransactions, balancete, type TxRow } from "@/lib/queries";
import { PageHeader, Card } from "@/components/cards";
import { fmtBRL, mesLabel } from "@/lib/format";

export const revalidate = 300; // ISR: abre instantâneo; invalidado no sync/reclassify

const cell = (n: number) =>
  n ? n.toLocaleString("pt-BR", { maximumFractionDigits: 0 }) : "—";

export default async function Page() {
  let txs: TxRow[] = [];
  try {
    txs = await fetchAllTransactions();
  } catch (e) {
    // stale-if-error: re-lança p/ o ISR manter a última versão boa se o banco oscilar.
    throw e instanceof Error ? e : new Error(typeof e === "string" ? e : JSON.stringify(e));
  }

  const { meses, linhas } = balancete(txs);
  const grupos: Array<"Receita" | "Despesa" | "Interna"> = ["Receita", "Despesa", "Interna"];
  const totalGrupo = (g: string) =>
    linhas.filter((l) => l.grupo === g).reduce((s, l) => s + l.total, 0);
  const totalRec = totalGrupo("Receita");
  const totalDesp = totalGrupo("Despesa");

  return (
    <>
      <PageHeader titulo="Balancete gerencial" />
      {txs.length === 0 ? (
        <Card>
          <p className="py-6 text-center text-sm text-slate-500">
            Sem dados. Sincronize na Visão Geral.
          </p>
        </Card>
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <th className="sticky left-0 z-10 bg-slate-50 px-3 py-2 text-left">Conta</th>
                {meses.map((m) => (
                  <th key={m} className="px-3 py-2 text-right">
                    {mesLabel(m)}
                  </th>
                ))}
                <th className="px-3 py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {grupos.map((g) => {
                const ls = linhas.filter((l) => l.grupo === g);
                if (!ls.length) return null;
                const subt = totalGrupo(g);
                return (
                  <FragmentGroup
                    key={g}
                    titulo={
                      g === "Receita"
                        ? "Receitas"
                        : g === "Despesa"
                        ? "Despesas"
                        : "Transferências internas (informativo)"
                    }
                    meses={meses}
                    linhas={ls}
                    subtotal={subt}
                  />
                );
              })}
              <tr className="border-t-2 border-slate-300 bg-[#1f5237]/5 font-semibold">
                <td className="sticky left-0 z-10 bg-[#eef3f4] px-3 py-2">
                  RESULTADO (Receitas − Despesas)
                </td>
                {meses.map((m) => (
                  <td key={m} className="px-3 py-2" />
                ))}
                <td
                  className={`px-3 py-2 text-right ${
                    totalRec - totalDesp >= 0 ? "text-emerald-700" : "text-red-700"
                  }`}
                >
                  {fmtBRL(totalRec - totalDesp)}
                </td>
              </tr>
            </tbody>
          </table>
          <div className="border-t border-slate-100 px-3 py-2 text-xs text-slate-400">
            Valores em módulo (entradas e saídas positivos). Resultado provisório — sobe
            de precisão conforme as transações “a classificar” forem mapeadas.
          </div>
        </Card>
      )}
    </>
  );
}

function FragmentGroup({
  titulo,
  meses,
  linhas,
  subtotal,
}: {
  titulo: string;
  meses: string[];
  linhas: { conta: string; porMes: Map<string, number>; total: number }[];
  subtotal: number;
}) {
  return (
    <>
      <tr className="bg-slate-100/70">
        <td
          colSpan={meses.length + 2}
          className="sticky left-0 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-600"
        >
          {titulo}
        </td>
      </tr>
      {linhas.map((l) => (
        <tr key={l.conta} className="border-b border-slate-100 hover:bg-slate-50">
          <td className="sticky left-0 z-10 bg-white px-3 py-1.5 text-slate-700">
            {l.conta}
          </td>
          {meses.map((m) => (
            <td key={m} className="px-3 py-1.5 text-right text-slate-600">
              {cell(l.porMes.get(m) ?? 0)}
            </td>
          ))}
          <td className="px-3 py-1.5 text-right font-medium text-slate-800">
            {fmtBRL(l.total)}
          </td>
        </tr>
      ))}
      <tr className="border-b border-slate-200 bg-slate-50 text-sm font-semibold text-slate-700">
        <td className="sticky left-0 z-10 bg-slate-50 px-3 py-1.5">Subtotal</td>
        {meses.map((m) => (
          <td key={m} className="px-3 py-1.5" />
        ))}
        <td className="px-3 py-1.5 text-right">{fmtBRL(subtotal)}</td>
      </tr>
    </>
  );
}
