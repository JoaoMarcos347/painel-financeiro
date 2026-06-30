// Marca exibida na interface (client-safe).
// Personalize por cliente definindo NEXT_PUBLIC_BRAND_NAME no .env.
export const BRAND_NAME = (process.env.NEXT_PUBLIC_BRAND_NAME || "Painel Financeiro").trim();

/** Modo demonstração (client-safe). Esconde botões que exigem credencial. */
export const IS_DEMO = process.env.NEXT_PUBLIC_DEMO_MODE === "1";
