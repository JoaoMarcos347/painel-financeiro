export const fmtBRL = (n: number) =>
  (n ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const fmtBRLshort = (n: number) => {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `R$ ${(n / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}M`;
  if (abs >= 1_000) return `R$ ${(n / 1_000).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}k`;
  return fmtBRL(n);
};

export const fmtNum = (n: number) =>
  (n ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 0 });

export const fmtData = (d: string | null) => {
  if (!d) return "";
  const [y, m, dia] = d.slice(0, 10).split("-");
  return `${dia}/${m}/${y}`;
};

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
export const mesLabel = (ym: string) => {
  const [y, m] = ym.split("-");
  return `${MESES[Number(m) - 1] ?? m}/${(y ?? "").slice(2)}`;
};

export const maskDoc = (s: string | null) => {
  const d = (s ?? "").replace(/\D/g, "");
  if (d.length === 14) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
  if (d.length === 11) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  return s ?? "";
};
