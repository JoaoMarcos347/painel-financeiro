import { NextResponse } from "next/server";
import { fetchAllTransactions, getAccounts, getNomeGrupo } from "@/lib/queries";
import { montarContextoChat, SYSTEM_CHAT } from "@/lib/chat";
import { getAnthropic, MODELO_IA } from "@/lib/anthropic";

export const runtime = "nodejs";
export const maxDuration = 120;

type Msg = { role: "user" | "assistant"; content: string };

export async function POST(req: Request) {
  let messages: Msg[];
  try {
    const body = await req.json();
    messages = Array.isArray(body?.messages) ? body.messages : [];
    if (!messages.length) throw new Error("sem mensagens");
  } catch {
    return NextResponse.json({ ok: false, erro: "Mensagem inválida." }, { status: 400 });
  }

  let client, contexto;
  try {
    client = getAnthropic();
    const [txs, accounts, nomeGrupo] = await Promise.all([
      fetchAllTransactions(),
      getAccounts(),
      getNomeGrupo(),
    ]);
    contexto = montarContextoChat(txs, accounts, nomeGrupo);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }

  const limpa = messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .slice(-12)
    .map((m) => ({ role: m.role, content: String(m.content ?? "") }));

  const stream = client.messages.stream({
    model: MODELO_IA,
    max_tokens: 2048,
    system: [
      { type: "text", text: SYSTEM_CHAT },
      {
        type: "text",
        text: "Contexto financeiro (JSON):\n" + JSON.stringify(contexto),
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: limpa,
  });

  const encoder = new TextEncoder();
  const rs = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        stream.on("text", (delta) => controller.enqueue(encoder.encode(delta)));
        await stream.finalMessage();
        controller.close();
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Erro ao gerar resposta.";
        controller.enqueue(encoder.encode("\n\n⚠️ " + msg));
        controller.close();
      }
    },
  });

  return new Response(rs, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}
