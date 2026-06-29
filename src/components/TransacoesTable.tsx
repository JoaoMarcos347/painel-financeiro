"use client";

import { useMemo, useState } from "react";
import type { TxRow } from "@/lib/queries";
import { fmtBRL, fmtData, maskDoc } from "@/lib/format";

const LIMITE = 300;

export function TransacoesTable({
  rows,
  nameById,
}: {
  rows: TxRow[];
  nameById: Record<string, string>;
}) {
  const [busca, setBusca] = useState("");
  const [tipo, setTipo] = useState<"todos" | "CREDIT" | "DEBIT">("todos");
  const [soAClassificar, setSoAClassificar] = useState(false);

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return rows.filter((t) => {
      if (tipo !== "todos" && t.tipo !== tipo) return false;
      if (soAClassificar && t.classif_origem !== "—") return false;
      if (!q) return true;
      return (
        (t.contraparte_nome ?? "").toLowerCase().includes(q) ||
        (t.descricao ?? "").toLowerCase().includes(q) ||
        (t.conta_nome ?? "").toLowerCase().includes(q) ||
        (t.contraparte_doc ?? "").includes(q)
      );
    });
  }, [rows, busca, tipo, soAClassificar]);

  const mostradas = filtradas.slice(0, LIMITE);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar contraparte, descrição, conta…"
          className="w-72 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#334155]"
        />
        <select
          value={tipo}
          onChange={(e) => setTipo(e.target.value as typeof tipo)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="todos">Todos</option>
          <option value="CREDIT">Entradas</option>
          <option value="DEBIT">Saídas</option>
        </select>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={soAClassificar}
            onChange={(e) => setSoAClassificar(e.target.checked)}
          />
          Só a classificar
        </label>
        <span className="ml-auto text-sm text-slate-500">
          {filtradas.length.toLocaleString("pt-BR")} transações
          {filtradas.length > LIMITE ? ` (mostrando ${LIMITE})` : ""}
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="px-3 py-2">Data</th>
              <th className="px-3 py-2">Tipo</th>
              <th className="px-3 py-2 text-right">Valor</th>
              <th className="px-3 py-2">Contraparte</th>
              <th className="px-3 py-2">Categoria Autmais</th>
              <th className="px-3 py-2">Conta sugerida</th>
              <th className="px-3 py-2">Confiança</th>
            </tr>
          </thead>
          <tbody>
            {mostradas.map((t) => (
              <tr key={t.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="whitespace-nowrap px-3 py-2 text-slate-600">
                  {fmtData(t.data)}
                </td>
                <td className="px-3 py-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      t.tipo === "CREDIT"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-red-50 text-red-700"
                    }`}
                  >
                    {t.tipo === "CREDIT" ? "Entrada" : "Saída"}
                  </span>
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-right font-medium">
                  {fmtBRL(Math.abs(t.valor ?? 0))}
                </td>
                <td className="px-3 py-2">
                  <div className="max-w-[240px] truncate text-slate-700">
                    {t.contraparte_nome || (
                      <span className="text-slate-400">(sem identificação)</span>
                    )}
                  </div>
                  {t.contraparte_doc && (
                    <div className="text-xs text-slate-400">{maskDoc(t.contraparte_doc)}</div>
                  )}
                </td>
                <td className="px-3 py-2 text-xs text-slate-500">
                  {t.categoria_autmais ?? "—"}
                </td>
                <td className="px-3 py-2">
                  <span
                    className={
                      t.is_internal
                        ? "text-slate-400"
                        : t.classif_origem === "—"
                        ? "text-amber-600"
                        : "text-slate-700"
                    }
                  >
                    {t.conta_nome ?? "—"}
                  </span>
                </td>
                <td className="px-3 py-2 text-xs text-slate-500">{t.classif_confianca}</td>
              </tr>
            ))}
            {mostradas.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-slate-400">
                  Nenhuma transação encontrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
