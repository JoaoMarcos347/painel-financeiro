"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  Cell,
  PieChart,
  Pie,
  AreaChart,
  Area,
  LineChart,
  Line,
  ReferenceLine,
} from "recharts";
import { fmtBRL, fmtBRLshort, mesLabel } from "@/lib/format";

const tooltipFmt = (v: number) => fmtBRL(v);

// Paleta do painel
const TEAL = "#334155";
const ORANGE = "#2563eb";
export const PALETA = [
  "#2563eb", // laranja
  "#334155", // petróleo
  "#7c3aed", // vinho
  "#0ea5e9", // dourado
  "#5b7a8a", // petróleo claro
  "#14b8a6", // marrom
  "#6366f1", // laranja claro
  "#3f6374", // azul acinzentado
];

export function EvolucaoChart({
  data,
}: {
  data: { mes: string; entradas: number; saidas: number }[];
}) {
  const d = data.map((x) => ({ ...x, label: mesLabel(x.mes) }));
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={d} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#64748b" }} />
        <YAxis tickFormatter={fmtBRLshort} tick={{ fontSize: 11, fill: "#64748b" }} width={64} />
        <Tooltip formatter={tooltipFmt as never} />
        <Legend />
        <Bar dataKey="entradas" name="Entradas" fill="#3f8f6f" radius={[4, 4, 0, 0]} />
        <Bar dataKey="saidas" name="Saídas" fill={ORANGE} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DespesasChart({ data }: { data: { conta: string; total: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(240, data.length * 32)}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" horizontal={false} />
        <XAxis type="number" tickFormatter={fmtBRLshort} tick={{ fontSize: 11, fill: "#64748b" }} />
        <YAxis type="category" dataKey="conta" width={170} tick={{ fontSize: 12, fill: "#334155" }} />
        <Tooltip formatter={tooltipFmt as never} />
        <Bar dataKey="total" name="Despesas" fill={TEAL} radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DonutChart({ data }: { data: { nome: string; valor: number }[] }) {
  const total = data.reduce((s, d) => s + d.valor, 0);
  return (
    <div>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            dataKey="valor"
            nameKey="nome"
            innerRadius={56}
            outerRadius={92}
            paddingAngle={2}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={PALETA[i % PALETA.length]} />
            ))}
          </Pie>
          <Tooltip formatter={tooltipFmt as never} />
        </PieChart>
      </ResponsiveContainer>
      {/* Legenda própria embaixo: quebra linha no celular, mostra o % */}
      <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1.5">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-1.5 text-xs text-slate-600">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-sm"
              style={{ background: PALETA[i % PALETA.length] }}
            />
            <span className="max-w-[150px] truncate" title={d.nome}>
              {d.nome}
            </span>
            <span className="text-slate-400">
              {total ? Math.round((d.valor / total) * 100) : 0}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function FluxoArea({ data }: { data: { dia: string; acumulado: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
        <XAxis dataKey="dia" tick={{ fontSize: 11, fill: "#64748b" }} />
        <YAxis tickFormatter={fmtBRLshort} tick={{ fontSize: 11, fill: "#64748b" }} width={64} />
        <Tooltip formatter={tooltipFmt as never} labelFormatter={(l) => `Dia ${l}`} />
        <ReferenceLine y={0} stroke="#94a3b8" />
        <Area
          dataKey="acumulado"
          name="Acumulado no mês"
          stroke={TEAL}
          fill={TEAL}
          fillOpacity={0.15}
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function TendenciaLine({ data }: { data: { mes: string; resultado: number }[] }) {
  const d = data.map((x) => ({ ...x, label: mesLabel(x.mes) }));
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={d} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#64748b" }} />
        <YAxis tickFormatter={fmtBRLshort} tick={{ fontSize: 11, fill: "#64748b" }} width={64} />
        <Tooltip formatter={tooltipFmt as never} />
        <ReferenceLine y={0} stroke="#94a3b8" />
        <Line
          dataKey="resultado"
          name="Resultado"
          stroke={ORANGE}
          strokeWidth={2.5}
          dot={{ r: 3 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
