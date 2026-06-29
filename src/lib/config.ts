// ───────────────────────────────────────────────────────────────────────────
// Configuração central da aplicação, por ambiente (profiles dev / prod).
//
// Como funciona:
//   • dev  ("npm run dev",   NODE_ENV=development) -> usa padrões de localhost
//   • prod ("npm run build", NODE_ENV=production)  -> usa as variáveis de produção
//
// Tudo que lê variável de ambiente passa por AQUI — fonte única de verdade.
// Importar só no servidor (contém segredos; nunca em componentes client).
// ───────────────────────────────────────────────────────────────────────────

const appEnv = (process.env.APP_ENV ?? process.env.NODE_ENV ?? "development").toLowerCase();

export const isProd = appEnv === "production";
export const isDev = !isProd;

/** Em dev cai no padrão de localhost se a env não existir; em prod exige a env. */
function devFallback(value: string | undefined, localhostDefault: string): string {
  if (value && value.trim()) return value.trim();
  return isDev ? localhostDefault : "";
}

export const config = {
  /** "development" | "production" (ou o APP_ENV customizado) */
  env: appEnv,
  isProd,
  isDev,

  // ── Banco de dados (PostgreSQL) ──
  // Usado na migração futura para Postgres direto. Em dev aponta pro localhost.
  databaseUrl: devFallback(
    process.env.DATABASE_URL,
    "postgresql://app_financeiro@localhost:5432/painel_joao_marcos"
  ),

  // ── SSO (Google Workspace) ──
  // Em dev sem SSO configurado, o login é dispensado (ver authDispensado).
  sso: {
    baseUrl: (process.env.SSO_BASE_URL ?? "").replace(/\/$/, ""),
  },

  // ── Autmais (Open Finance) ──
  autmais: {
    authBase: process.env.AUTMAIS_AUTH_BASE ?? "https://api3.autmais.com.br/v1",
    mongoBase: process.env.AUTMAIS_MONGO_BASE ?? "https://apimongo.autmais.com.br/v1",
    user: process.env.AUTMAIS_USER ?? "",
    pass: process.env.AUTMAIS_PASS ?? "",
    tenant: process.env.AUTMAIS_TENANT ?? "",
  },

  // ── Painel ──
  painel: {
    // Documento (CPF/CNPJ, só dígitos) da empresa-alvo na Autmais.
    empresaDoc: (process.env.PAINEL_EMPRESA_DOC ?? "").replace(/\D/g, ""),
    // Nome da marca usado no servidor (textos/IA). Para o wordmark da interface
    // (client-side) use NEXT_PUBLIC_BRAND_NAME.
    brandName: process.env.PAINEL_BRAND_NAME?.trim() || "Painel Financeiro",
  },

  // ── Segredos diversos ──
  cronSecret: process.env.CRON_SECRET ?? "",
  anthropicKey: process.env.ANTHROPIC_API_KEY ?? "",
};

/** Modo demonstração (vitrine): libera o acesso sem login — use só com dados fictícios. */
export const isDemo = (process.env.DEMO_MODE ?? process.env.NEXT_PUBLIC_DEMO_MODE) === "1";

/**
 * Dispensa o login quando: (dev OU modo demo) E sem SSO configurado.
 * Em produção real o SSO está setado, então NUNCA dispensa.
 */
export const authDispensado = (isDev || isDemo) && !config.sso.baseUrl;
