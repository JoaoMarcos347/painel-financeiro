"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp, ArrowDown, TrendingUp, TrendingDown, Sparkles, RefreshCw, MessageCircle } from "lucide-react";
import { Card } from "@/components/cards";
import {
  EvolucaoChart,
  DespesasChart,
  DonutChart,
  FluxoArea,
  TendenciaLine,
} from "@/components/charts";
import { fmtBRL, mesLabel } from "@/lib/format";
import { IAIcon } from "@/components/IAIcon";
import type { Comentarios } from "@/lib/insights";

const A_CLASSIFICAR = "A classificar / Outros";

type Evo = { mes: string; entradas: number; saidas: number };
type Rec = Record<string, Record<string, number>>;

/** Comentário do analista (IA) embaixo de um widget, com botão discreto pra aprofundar no chat. */
function Analista({ titulo, mes, texto }: { titulo: string; mes: string; texto?: string }) {
  if (!texto) return null;
  function aprofundar() {
    window.dispatchEvent(new CustomEvent("ia-aprofundar", { detail: { titulo, mes, texto } }));
  }
  return (
    <div className="group mt-3 flex items-start gap-2 rounded-lg bg-[#334155]/[0.06] px-3 py-2 text-[13px] leading-relaxed text-slate-600">
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#334155] p-0.5">
        <IAIcon className="h-full w-full" />
      </span>
      <span className="flex-1">{texto}</span>
      <button
        type="button"
        onClick={aprofundar}
        title="Conversar sobre isso com a IA"
        aria-label="Conversar sobre esta análise com a IA"
        className="shrink-0 self-center rounded-md p-1 text-slate-400 opacity-50 transition hover:bg-white hover:text-[#2563eb] group-hover:opacity-100"
      >
        <MessageCircle size={15} />
      </button>
    </div>
  );
}

function Delta({
  atual,
  anterior,
  goodWhenUp,
}: {
  atual: number;
  anterior: number | undefined;
  goodWhenUp: boolean;
}) {
  if (anterior === undefined)
    return <span className="text-xs text-slate-400">sem mês anterior</span>;
  const d = atual - anterior;
  const pct = anterior > 0 ? (d / anterior) * 100 : atual > 0 ? 100 : 0;
  if (Math.abs(d) < 0.005)
    return <span className="text-xs text-slate-400">igual ao mês anterior</span>;
  const up = d > 0;
  const good = goodWhenUp ? up : !up;
  const Icon = up ? ArrowUp : ArrowDown;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-medium ${
        good ? "text-emerald-600" : "text-red-600"
      }`}
    >
      <Icon size={13} />
      {Math.abs(pct).toFixed(0)}% vs mês anterior
    </span>
  );
}

function KpiMes({
  titulo,
  valor,
  cor,
  delta,
}: {
  titulo: string;
  valor: number;
  cor: string;
  delta?: React.ReactNode;
}) {
  return (
    <Card className="relative overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-[3px] before:bg-gradient-to-r before:from-[#2563eb] before:to-transparent before:content-['']">
      <span className="eyebrow">{titulo}</span>
      <div className={`mt-3 font-serif text-3xl ${cor}`}>{fmtBRL(valor)}</div>
      {delta && <div className="mt-2">{delta}</div>}
    </Card>
  );
}

function MiniStat({
  titulo,
  valor,
  sub,
  cor = "text-slate-900",
}: {
  titulo: string;
  valor: string;
  sub?: string;
  cor?: string;
}) {
  return (
    <Card>
      <span className="eyebrow">{titulo}</span>
      <div className={`mt-3 font-serif text-2xl ${cor}`}>{valor}</div>
      {sub && <div className="mt-1.5 truncate text-xs text-slate-400">{sub}</div>}
    </Card>
  );
}

export function DashboardMensal({
  evo,
  porMesConta,
  porMesGrupo,
  fluxoDiario,
  receitasTop,
  maiorGasto,
  comentarios,
  saldoTotal,
  pctClassificado,
  aClassificar,
  totalTx,
  ultimaSync,
}: {
  evo: Evo[];
  porMesConta: Rec;
  porMesGrupo: Rec;
  fluxoDiario: Rec;
  receitasTop: Record<string, { nome: string; total: number }[]>;
  maiorGasto: Record<string, { nome: string; valor: number; conta: string }>;
  comentarios: Record<string, { payload: Comentarios; gerado_em: string }>;
  saldoTotal: number;
  pctClassificado: number;
  aClassificar: number;
  totalTx: number;
  ultimaSync: string | null;
}) {
  const router = useRouter();
  const meses = useMemo(() => evo.map((e) => e.mes), [evo]);
  const [mesSel, setMesSel] = useState(meses[meses.length - 1] ?? "");
  const [analisando, setAnalisando] = useState(false);
  const [erroIA, setErroIA] = useState<string | null>(null);

  const com = comentarios[mesSel]?.payload;

  async function analisar() {
    setAnalisando(true);
    setErroIA(null);
    try {
      const r = await fetch("/api/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mes: mesSel }),
      });
      const j = await r.json();
      if (j.ok) router.refresh();
      else setErroIA(j.erro ?? "Falha ao gerar a análise");
    } catch (e) {
      setErroIA(e instanceof Error ? e.message : "Falha ao gerar a análise");
    } finally {
      setAnalisando(false);
    }
  }

  const idx = meses.indexOf(mesSel);
  const prevMes = idx > 0 ? meses[idx - 1] : undefined;
  const ev = evo.find((e) => e.mes === mesSel);
  const evPrev = prevMes ? evo.find((e) => e.mes === prevMes) : undefined;

  const receitas = ev?.entradas ?? 0;
  const despesas = ev?.saidas ?? 0;
  const resultado = receitas - despesas;
  const margem = receitas > 0 ? (resultado / receitas) * 100 : 0;
  const despesaMedia =
    evo.length > 0 ? evo.reduce((s, e) => s + e.saidas, 0) / evo.length : 0;
  const sobraMeses = despesaMedia > 0 ? saldoTotal / despesaMedia : 0;
  const maiorG = maiorGasto[mesSel];

  // Donut por grupo (top 6 + Outros)
  const gruposMes = Object.entries(porMesGrupo[mesSel] ?? {}).sort((a, b) => b[1] - a[1]);
  const donut = gruposMes.slice(0, 6).map(([nome, valor]) => ({ nome, valor }));
  const restoOutros = gruposMes.slice(6).reduce((s, [, v]) => s + v, 0);
  if (restoOutros > 0) donut.push({ nome: "Outros", valor: restoOutros });

  // Maiores gastos por conta
  const contasMes = porMesConta[mesSel] ?? {};
  const aClassMes = contasMes[A_CLASSIFICAR] ?? 0;
  const gastosConta = Object.entries(contasMes)
    .filter(([c]) => c !== A_CLASSIFICAR)
    .map(([conta, total]) => ({ conta, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  // Fluxo acumulado do mês
  const fluxoData = useMemo(() => {
    const m = fluxoDiario[mesSel] ?? {};
    const maxDia = Object.keys(m).reduce((mx, d) => Math.max(mx, Number(d)), 0);
    let cum = 0;
    const out: { dia: string; acumulado: number }[] = [];
    for (let d = 1; d <= maxDia; d++) {
      const dd = String(d).padStart(2, "0");
      cum += m[dd] ?? 0;
      out.push({ dia: dd, acumulado: cum });
    }
    return out;
  }, [fluxoDiario, mesSel]);

  // Tendência do resultado
  const tendencia = evo.map((e) => ({ mes: e.mes, resultado: e.entradas - e.saidas }));

  // Recorrentes (categorias presentes na maioria dos meses)
  const recorrentes = useMemo(() => {
    const thr = Math.max(2, Math.ceil(meses.length / 2));
    const contas = new Set<string>();
    for (const m of meses)
      for (const c of Object.keys(porMesConta[m] ?? {})) if (c !== A_CLASSIFICAR) contas.add(c);
    const rows = [];
    for (const c of contas) {
      const presentes = meses
        .map((m) => porMesConta[m]?.[c] ?? 0)
        .filter((v) => v > 0);
      if (presentes.length < thr) continue;
      const media = presentes.reduce((s, v) => s + v, 0) / presentes.length;
      const atual = porMesConta[mesSel]?.[c] ?? 0;
      rows.push({ conta: c, media, atual, pago: atual > 0 });
    }
    return rows.sort((a, b) => b.media - a.media).slice(0, 12);
  }, [porMesConta, meses, mesSel]);

  // Maiores variações (movers)
  const { subiu, caiu } = useMemo(() => {
    const atual = porMesConta[mesSel] ?? {};
    const ant = prevMes ? porMesConta[prevMes] ?? {} : {};
    const contas = new Set([...Object.keys(atual), ...Object.keys(ant)]);
    const movs: { conta: string; d: number; atual: number; ant: number }[] = [];
    for (const c of contas) {
      if (c === A_CLASSIFICAR) continue;
      const a = atual[c] ?? 0;
      const b = ant[c] ?? 0;
      movs.push({ conta: c, d: a - b, atual: a, ant: b });
    }
    return {
      subiu: movs.filter((m) => m.d > 0).sort((a, b) => b.d - a.d).slice(0, 5),
      caiu: movs.filter((m) => m.d < 0).sort((a, b) => a.d - b.d).slice(0, 5),
    };
  }, [porMesConta, mesSel, prevMes]);

  // Heatmap grupos x meses
  const heat = useMemo(() => {
    const totalPorGrupo = new Map<string, number>();
    for (const m of meses)
      for (const [g, v] of Object.entries(porMesGrupo[m] ?? {}))
        totalPorGrupo.set(g, (totalPorGrupo.get(g) ?? 0) + v);
    const grupos = [...totalPorGrupo.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map((x) => x[0]);
    let max = 0;
    for (const m of meses)
      for (const g of grupos) max = Math.max(max, porMesGrupo[m]?.[g] ?? 0);
    return { grupos, max };
  }, [porMesGrupo, meses]);

  const receitasMes = receitasTop[mesSel] ?? [];
  const maxReceita = Math.max(1, ...receitasMes.map((r) => r.total));

  return (
    <div className="space-y-6">
      {/* Seletor + nota */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <span className="font-medium">Mês:</span>
          <select
            value={mesSel}
            onChange={(e) => setMesSel(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium"
          >
            {[...meses].reverse().map((m) => (
              <option key={m} value={m}>
                {mesLabel(m)}
              </option>
            ))}
          </select>
        </label>
        <div className="text-xs text-slate-500">
          {pctClassificado}% classificado · {aClassificar} de {totalTx} a classificar
        </div>
      </div>

      {/* Analista virtual — resumo do mês + gerar/atualizar */}
      <Card className="border-l-4 border-l-[#2563eb]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="flex min-w-0 gap-3">
            <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#334155] p-1">
              <IAIcon className="h-full w-full" />
            </span>
            <div className="min-w-0">
              <div className="font-serif text-lg text-[#334155]">Análise do mês — {mesLabel(mesSel)}</div>
              {com?.resumo ? (
                <p className="mt-1 text-[15px] leading-relaxed text-slate-700">{com.resumo}</p>
              ) : (
                <p className="mt-1 text-sm text-slate-500">
                  Peça ao analista da IA para ler este mês e comentar cada gráfico do painel.
                </p>
              )}
              {erroIA && <p className="mt-1 text-sm text-red-600">{erroIA}</p>}
            </div>
          </div>
          <button
            onClick={analisar}
            disabled={analisando}
            className="inline-flex shrink-0 items-center gap-2 self-start rounded-lg bg-[#2563eb] px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-[#1d4ed8] disabled:opacity-60"
          >
            {com?.resumo ? (
              <RefreshCw size={15} className={analisando ? "animate-spin" : ""} />
            ) : (
              <Sparkles size={15} className={analisando ? "animate-pulse" : ""} />
            )}
            {analisando ? "Analisando…" : com?.resumo ? "Atualizar" : "Analisar com IA"}
          </button>
        </div>
      </Card>

      {/* KPIs principais */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiMes titulo="Receitas do mês" valor={receitas} cor="text-emerald-600" delta={<Delta atual={receitas} anterior={evPrev?.entradas} goodWhenUp />} />
        <KpiMes titulo="Despesas do mês" valor={despesas} cor="text-red-600" delta={<Delta atual={despesas} anterior={evPrev?.saidas} goodWhenUp={false} />} />
        <KpiMes titulo="Resultado do mês" valor={resultado} cor={resultado >= 0 ? "text-emerald-600" : "text-red-600"} delta={<Delta atual={resultado} anterior={evPrev ? evPrev.entradas - evPrev.saidas : undefined} goodWhenUp />} />
        <KpiMes titulo="Saldo das contas" valor={saldoTotal} cor="text-[#334155]" />
      </div>

      {/* Mini stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MiniStat titulo="Margem do mês" valor={`${margem.toFixed(1)}%`} cor={margem >= 0 ? "text-emerald-600" : "text-red-600"} sub="resultado ÷ receitas" />
        <MiniStat titulo="Maior gasto do mês" valor={maiorG ? fmtBRL(maiorG.valor) : "—"} sub={maiorG ? `${maiorG.nome} · ${maiorG.conta}` : ""} />
        <MiniStat titulo="Sobra de caixa" valor={saldoTotal <= 0 ? "saldo negativo" : `${sobraMeses.toFixed(1)} meses`} cor={saldoTotal <= 0 ? "text-red-600" : "text-slate-900"} sub="saldo ÷ despesa média mensal" />
      </div>
      <Analista titulo="Indicadores do mês" mes={mesLabel(mesSel)} texto={com?.kpis} />

      {/* Donut + maiores gastos por conta */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <div className="mb-3 text-sm font-semibold text-slate-700">
            Composição das despesas — {mesLabel(mesSel)}{" "}
            <span className="font-normal text-slate-400">(total {fmtBRL(despesas)})</span>
          </div>
          {donut.length ? <DonutChart data={donut} /> : <Vazio />}
          <Analista titulo="Composição das despesas" mes={mesLabel(mesSel)} texto={com?.donut} />
        </Card>
        <Card>
          <div className="mb-1 text-sm font-semibold text-slate-700">Maiores gastos por conta</div>
          {aClassMes > 0 && (
            <div className="mb-2 text-xs text-amber-600">
              + {fmtBRL(aClassMes)} ainda a classificar neste mês
            </div>
          )}
          {gastosConta.length ? <DespesasChart data={gastosConta} /> : <Vazio />}
          <Analista titulo="Maiores gastos por conta" mes={mesLabel(mesSel)} texto={com?.maiores_gastos} />
        </Card>
      </div>

      {/* Fluxo do mês + evolução */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <div className="mb-3 text-sm font-semibold text-slate-700">
            Fluxo de caixa do mês (acumulado dia a dia)
          </div>
          {fluxoData.length ? <FluxoArea data={fluxoData} /> : <Vazio />}
          <Analista titulo="Fluxo de caixa do mês" mes={mesLabel(mesSel)} texto={com?.fluxo} />
        </Card>
        <Card>
          <div className="mb-3 text-sm font-semibold text-slate-700">
            Evolução mensal (entradas × saídas)
          </div>
          <EvolucaoChart data={evo} />
          <Analista titulo="Evolução mensal (entradas × saídas)" mes={mesLabel(mesSel)} texto={com?.evolucao} />
        </Card>
      </div>

      {/* Movers + recorrentes */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <div className="mb-3 text-sm font-semibold text-slate-700">
            Maiores variações vs mês anterior
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <MoverList titulo="Subiu mais" itens={subiu} cor="red" icon={<TrendingUp size={14} />} />
            <MoverList titulo="Caiu mais" itens={caiu} cor="green" icon={<TrendingDown size={14} />} />
          </div>
          <Analista titulo="Maiores variações vs mês anterior" mes={mesLabel(mesSel)} texto={com?.movers} />
        </Card>
        <Card>
          <div className="mb-3 text-sm font-semibold text-slate-700">
            Radar de contas recorrentes
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-2 pr-2">Conta</th>
                  <th className="px-2 py-2 text-right">Média/mês</th>
                  <th className="px-2 py-2 text-right">Este mês</th>
                  <th className="py-2 pl-2 text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {recorrentes.map((r) => {
                  const acima = r.atual > r.media * 1.05;
                  const abaixo = r.atual > 0 && r.atual < r.media * 0.95;
                  return (
                    <tr key={r.conta} className="border-b border-slate-100">
                      <td className="max-w-[150px] truncate py-1.5 pr-2 text-slate-700">{r.conta}</td>
                      <td className="px-2 py-1.5 text-right text-slate-500">{fmtBRL(r.media)}</td>
                      <td className={`px-2 py-1.5 text-right font-medium ${acima ? "text-red-600" : abaixo ? "text-emerald-600" : "text-slate-800"}`}>
                        {r.pago ? fmtBRL(r.atual) : "—"}
                      </td>
                      <td className="py-1.5 pl-2 text-center">
                        {r.pago ? (
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">pago</span>
                        ) : (
                          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700">não apareceu</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {recorrentes.length === 0 && (
                  <tr><td colSpan={4} className="py-6 text-center text-slate-400">Poucos meses pra detectar recorrência.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <Analista titulo="Contas recorrentes" mes={mesLabel(mesSel)} texto={com?.recorrentes} />
        </Card>
      </div>

      {/* Heatmap */}
      <Card>
        <div className="mb-3 text-sm font-semibold text-slate-700">
          Mapa de calor — gastos por grupo × mês
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-slate-500">
                <th className="py-1.5 pr-2 text-left">Grupo</th>
                {meses.map((m) => (
                  <th key={m} className="px-1 py-1.5 text-center font-medium">{mesLabel(m)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {heat.grupos.map((g) => (
                <tr key={g}>
                  <td className="max-w-[180px] truncate py-1 pr-2 text-slate-700">{g}</td>
                  {meses.map((m) => {
                    const v = porMesGrupo[m]?.[g] ?? 0;
                    const inten = heat.max > 0 ? v / heat.max : 0;
                    const bg = `rgba(44,74,90,${(0.06 + inten * 0.9).toFixed(2)})`;
                    return (
                      <td key={m} className="px-1 py-1">
                        <div
                          className="rounded px-1 py-1.5 text-center text-[11px]"
                          style={{ background: bg, color: inten > 0.5 ? "#fff" : "#334155" }}
                          title={`${g} · ${mesLabel(m)}: ${fmtBRL(v)}`}
                        >
                          {v ? (v / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 0 }) + "k" : "—"}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-2 text-xs text-slate-400">Valores em milhares (k). Mais escuro = mais gasto.</div>
        <Analista titulo="Mapa de calor (gastos por grupo)" mes={mesLabel(mesSel)} texto={com?.heatmap} />
      </Card>

      {/* Tendência + top clientes */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <div className="mb-3 text-sm font-semibold text-slate-700">
            Tendência do resultado (mês a mês)
          </div>
          <TendenciaLine data={tendencia} />
          <Analista titulo="Tendência do resultado" mes={mesLabel(mesSel)} texto={com?.tendencia} />
        </Card>
        <Card>
          <div className="mb-3 text-sm font-semibold text-slate-700">
            Maiores pagadores (receitas) — {mesLabel(mesSel)}
          </div>
          {receitasMes.length ? (
            <div className="space-y-2">
              {receitasMes.map((r) => (
                <div key={r.nome} className="flex items-center gap-2">
                  <div className="w-40 shrink-0 truncate text-sm text-slate-700" title={r.nome}>{r.nome}</div>
                  <div className="h-4 flex-1 overflow-hidden rounded bg-slate-100">
                    <div className="h-full rounded bg-emerald-500" style={{ width: `${(r.total / maxReceita) * 100}%` }} />
                  </div>
                  <div className="w-24 shrink-0 text-right text-sm font-medium text-slate-700">{fmtBRL(r.total)}</div>
                </div>
              ))}
            </div>
          ) : (
            <Vazio />
          )}
          <Analista titulo="Maiores pagadores" mes={mesLabel(mesSel)} texto={com?.top_pagadores} />
        </Card>
      </div>

      {ultimaSync && (
        <div className="text-xs text-slate-400">
          Última sincronização: {new Date(ultimaSync).toLocaleString("pt-BR")}
        </div>
      )}
    </div>
  );
}

function Vazio() {
  return <p className="py-8 text-center text-sm text-slate-400">Sem dados neste mês.</p>;
}

function MoverList({
  titulo,
  itens,
  cor,
  icon,
}: {
  titulo: string;
  itens: { conta: string; d: number; atual: number; ant: number }[];
  cor: "red" | "green";
  icon: React.ReactNode;
}) {
  return (
    <div>
      <div className={`mb-2 flex items-center gap-1 text-xs font-semibold ${cor === "red" ? "text-red-600" : "text-emerald-600"}`}>
        {icon}
        {titulo}
      </div>
      <div className="space-y-1.5">
        {itens.map((m) => (
          <div key={m.conta} className="flex items-center justify-between gap-2 text-sm">
            <span className="max-w-[120px] truncate text-slate-700">{m.conta}</span>
            <span className={`font-medium ${cor === "red" ? "text-red-600" : "text-emerald-600"}`}>
              {m.d > 0 ? "+" : ""}
              {fmtBRL(m.d)}
            </span>
          </div>
        ))}
        {itens.length === 0 && <div className="text-xs text-slate-400">—</div>}
      </div>
    </div>
  );
}
