"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Plus, Trash2, Check } from "lucide-react";
import { fmtBRL, maskDoc } from "@/lib/format";
import type { Pendencia, PlanoConta, RuleRow } from "@/lib/regras";

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function RegrasManager({
  pendencias,
  contas,
  rules,
}: {
  pendencias: Pendencia[];
  contas: PlanoConta[];
  rules: RuleRow[];
}) {
  const router = useRouter();
  const [sel, setSel] = useState<Record<string, string>>({});
  const [feitas, setFeitas] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [reclass, setReclass] = useState<string | null>(null);

  async function criarRegra(p: Pendencia) {
    const label = sel[p.chave];
    if (!label) return;
    const conta = contas.find((c) => c.label === label);
    if (!conta) return;
    setBusy(p.chave);
    const tipo_match = p.doc ? "doc" : "palavra";
    const valor_match = p.doc ? p.doc : escapeRegExp(p.nome);
    const r = await fetch("/api/rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tipo_match,
        valor_match,
        conta_codigo: conta.codigo,
        conta_nome: conta.nome,
        prioridade: 8,
      }),
    });
    const j = await r.json();
    setBusy(null);
    if (j.ok) setFeitas((f) => ({ ...f, [p.chave]: true }));
    else alert("Erro ao criar regra: " + j.erro);
  }

  async function reclassificar() {
    setReclass("Reclassificando…");
    const r = await fetch("/api/reclassify", { method: "POST" });
    const j = await r.json();
    if (j.ok) {
      setReclass(`${j.atualizadas} transações reclassificadas`);
      router.refresh();
    } else {
      setReclass("Erro: " + j.erro);
    }
  }

  async function excluirRegra(id: string) {
    if (!confirm("Excluir esta regra?")) return;
    await fetch(`/api/rules?id=${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-800">
              A classificar — {pendencias.length} contrapartes
            </h2>
            <p className="text-xs text-slate-500">
              Escolha a conta de cada contraparte e clique em “Criar regra”. Depois,
              clique em “Reclassificar” para aplicar.
            </p>
          </div>
          <button
            onClick={reclassificar}
            className="inline-flex items-center gap-2 rounded-lg bg-[#2563eb] px-4 py-2 text-sm font-medium text-white hover:bg-[#1d4ed8]"
          >
            <RefreshCw size={16} className={reclass === "Reclassificando…" ? "animate-spin" : ""} />
            Reclassificar
          </button>
        </div>
        {reclass && <p className="mb-2 text-sm text-slate-500">{reclass}</p>}

        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-3 py-2">Contraparte</th>
                <th className="px-3 py-2">Tipo</th>
                <th className="px-3 py-2 text-right">Qtd</th>
                <th className="px-3 py-2 text-right">Total</th>
                <th className="px-3 py-2">Conta do balancete</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {pendencias.map((p) => (
                <tr key={p.chave} className="border-b border-slate-100">
                  <td className="px-3 py-2">
                    <div className="max-w-[260px] truncate text-slate-700">{p.nome}</div>
                    {p.doc && <div className="text-xs text-slate-400">{maskDoc(p.doc)}</div>}
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-500">{p.tipo}</td>
                  <td className="px-3 py-2 text-right text-slate-600">{p.qtd}</td>
                  <td className="px-3 py-2 text-right font-medium">{fmtBRL(p.total)}</td>
                  <td className="px-3 py-2">
                    <select
                      value={sel[p.chave] ?? ""}
                      onChange={(e) => setSel((s) => ({ ...s, [p.chave]: e.target.value }))}
                      disabled={feitas[p.chave]}
                      className="w-64 rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                    >
                      <option value="">— escolher —</option>
                      {contas.map((c) => (
                        <option key={c.label} value={c.label}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    {feitas[p.chave] ? (
                      <span className="inline-flex items-center gap-1 text-sm text-emerald-600">
                        <Check size={15} /> regra criada
                      </span>
                    ) : (
                      <button
                        onClick={() => criarRegra(p)}
                        disabled={!sel[p.chave] || busy === p.chave}
                        className="inline-flex items-center gap-1 rounded-lg border border-[#2563eb] px-3 py-1.5 text-sm font-medium text-[#2563eb] hover:bg-[#2563eb]/5 disabled:opacity-40"
                      >
                        <Plus size={15} /> Criar regra
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {pendencias.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-slate-400">
                    Tudo classificado! 🎉
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-base font-semibold text-slate-800">
          Regras ativas — {rules.length}
        </h2>
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-3 py-2">Tipo</th>
                <th className="px-3 py-2">Quando bate</th>
                <th className="px-3 py-2">Vai para a conta</th>
                <th className="px-3 py-2 text-right">Prio.</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {rules.map((r) => (
                <tr key={r.id} className="border-b border-slate-100">
                  <td className="px-3 py-2 text-xs text-slate-500">{r.tipo_match}</td>
                  <td className="px-3 py-2">
                    <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-700">
                      {r.valor_match}
                    </code>
                  </td>
                  <td className="px-3 py-2 text-slate-700">
                    {r.conta_codigo ? `${r.conta_codigo} — ` : ""}
                    {r.conta_nome}
                  </td>
                  <td className="px-3 py-2 text-right text-slate-500">{r.prioridade}</td>
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={() => excluirRegra(r.id)}
                      className="text-slate-400 hover:text-red-600"
                      title="Excluir"
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
