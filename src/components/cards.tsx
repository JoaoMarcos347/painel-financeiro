import { fmtBRL } from "@/lib/format";

export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-[0_1px_3px_rgba(20,30,40,0.05)] ${className}`}>
      {children}
    </div>
  );
}

export function Kpi({
  titulo,
  valor,
  sub,
  cor = "slate",
}: {
  titulo: string;
  valor: number;
  sub?: string;
  cor?: "slate" | "green" | "red" | "blue";
}) {
  const cores: Record<string, string> = {
    slate: "text-slate-900",
    green: "text-emerald-600",
    red: "text-red-600",
    blue: "text-[#1f5237]",
  };
  return (
    <Card className="relative overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-[3px] before:bg-gradient-to-r before:from-[#2d6a40] before:to-transparent before:content-['']">
      <span className="eyebrow">{titulo}</span>
      <div className={`mt-3 font-serif text-3xl ${cores[cor]}`}>{fmtBRL(valor)}</div>
      {sub && <div className="mt-1.5 text-xs text-slate-400">{sub}</div>}
    </Card>
  );
}

export function PageHeader({
  titulo,
  children,
}: {
  titulo: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <span className="eyebrow">Painel Financeiro</span>
        <h1 className="mt-2 font-serif text-3xl text-[#1f5237]">{titulo}</h1>
      </div>
      {children}
    </div>
  );
}
