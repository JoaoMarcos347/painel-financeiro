import type { AutmaisTx } from "./autmais";

export type Rule = {
  tipo_match: "doc" | "palavra" | "categoria" | "interna";
  valor_match: string;
  conta_codigo: string | null;
  conta_nome: string;
  prioridade: number;
};

export type Classification = {
  conta_codigo: string | null;
  conta_nome: string;
  origem: string;
  confianca: string;
  is_internal: boolean;
};

const onlyDigits = (s?: string | null) => (s ?? "").replace(/\D/g, "");

export function counterpartyName(tx: AutmaisTx): string {
  return tx.type === "DEBIT"
    ? tx.paymentReceiverName || tx.merchantName || ""
    : tx.paymentPayerName || "";
}
export function counterpartyDoc(tx: AutmaisTx): string {
  return tx.type === "DEBIT"
    ? tx.paymentReceiverDocumentNumber || tx.merchantDocumentNumber || ""
    : tx.paymentPayerDocumentNumber || "";
}

/**
 * Classifica uma transação em uma conta do balancete.
 * Ordem: transferência interna (documento próprio) -> regras por prioridade
 * (doc, interna por categoria, palavra/regex, categoria) -> padrão de entrada -> A classificar.
 */
export function classify(
  tx: AutmaisTx,
  rules: Rule[],
  ownDocs: Set<string>
): Classification {
  const isDebit = tx.type === "DEBIT";
  const name = counterpartyName(tx);
  const cpDoc = onlyDigits(counterpartyDoc(tx));
  const text = [name, tx.merchantName, tx.description, tx.paymentDescription]
    .filter(Boolean)
    .join(" ")
    .toUpperCase();
  const cat = (tx.category ?? "").toUpperCase();

  // 1) Transferência interna entre contas/empresas próprias (pelo documento)
  if (cpDoc && ownDocs.has(cpDoc)) {
    return {
      conta_codigo: null,
      conta_nome: "Transferência interna",
      origem: "interna (conta própria)",
      confianca: "Alta",
      is_internal: true,
    };
  }

  const sorted = [...rules].sort((a, b) => a.prioridade - b.prioridade);
  for (const r of sorted) {
    if (r.tipo_match === "doc") {
      if (cpDoc && onlyDigits(r.valor_match) === cpDoc)
        return mk(r, "CNPJ/CPF", "Alta", false);
    } else if (r.tipo_match === "interna") {
      if (cat === r.valor_match.toUpperCase())
        return {
          conta_codigo: null,
          conta_nome: r.conta_nome,
          origem: "interna (categoria)",
          confianca: "Alta",
          is_internal: true,
        };
    } else if (r.tipo_match === "palavra") {
      try {
        if (new RegExp(r.valor_match, "i").test(text))
          return mk(r, "nome/descrição", "Alta", false);
      } catch {
        // regex inválida na regra: ignora
      }
    } else if (r.tipo_match === "categoria") {
      if (cat === r.valor_match.toUpperCase())
        return mk(r, "categoria Autmais", "Média", false);
    }
  }

  // 2) Entrada sem regra -> provável honorário (rever)
  if (
    tx.type === "CREDIT" &&
    ["INCOME", "TRANSFER - PIX", "TRANSFERS", "TRANSFER - TED", "TRANSFER - CHECK", "SALARY"].includes(cat)
  ) {
    return {
      conta_codigo: null,
      conta_nome: "Receitas de honorários",
      origem: "padrão entrada",
      confianca: "Baixa",
      is_internal: false,
    };
  }

  // 3) Resíduo
  return {
    conta_codigo: null,
    conta_nome: "A classificar / Outros",
    origem: "—",
    confianca: "—",
    is_internal: false,
  };
}

function mk(r: Rule, origem: string, confianca: string, is_internal: boolean): Classification {
  return {
    conta_codigo: r.conta_codigo,
    conta_nome: r.conta_nome,
    origem,
    confianca,
    is_internal,
  };
}
