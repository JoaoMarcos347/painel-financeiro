import Anthropic from "@anthropic-ai/sdk";
import { config } from "./config";

/**
 * Cliente Claude (Anthropic) — uso SOMENTE no servidor.
 * A chave (ANTHROPIC_API_KEY) fica em variável de ambiente; nunca no front.
 */
export function getAnthropic() {
  const key = config.anthropicKey;
  if (!key || key === "COLAR_AQUI") {
    throw new Error(
      "Falta a chave da IA. Preencha ANTHROPIC_API_KEY no .env.local (e nas variáveis da Vercel). " +
        "Pegue a chave em console.anthropic.com → API Keys."
    );
  }
  return new Anthropic({ apiKey: key });
}

/** Modelo padrão para as análises (mais capaz; roda só ao clicar, custo baixo). */
export const MODELO_IA = "claude-opus-4-8";
