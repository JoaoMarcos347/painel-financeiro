// Marca exibida na interface (client-safe).
// Personalize por cliente definindo NEXT_PUBLIC_BRAND_NAME no .env.
export const BRAND_NAME = (process.env.NEXT_PUBLIC_BRAND_NAME || "Painel Financeiro").trim();
