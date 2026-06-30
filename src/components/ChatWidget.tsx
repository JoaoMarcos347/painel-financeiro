"use client";

import { useEffect, useRef, useState } from "react";
import { X, Send } from "lucide-react";
import { IAIcon } from "@/components/IAIcon";

type Msg = { role: "user" | "assistant"; content: string };

const SAUDACAO =
  "Oi! Sou o analista financeiro virtual. Posso responder sobre o extrato — gastos, receitas, comparações entre meses, fornecedores, onde dá pra economizar. O que você quer saber?";

const SUGESTOES = [
  "Resuma o último mês",
  "Quais foram os 5 maiores gastos?",
  "Onde dá pra economizar?",
];

const LS_USOU = "painel_ia_usou";

export function ChatWidget() {
  const [aberto, setAberto] = useState(false);
  const [jaUsou, setJaUsou] = useState(true); // assume usado até confirmar (evita piscar)
  const [dica, setDica] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([{ role: "assistant", content: SAUDACAO }]);
  const [input, setInput] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [pendente, setPendente] = useState<string | null>(null);
  const fimRef = useRef<HTMLDivElement>(null);

  // Na 1ª visita (nunca abriu o chat), chama atenção: balão de convite após 1,2s.
  useEffect(() => {
    const usou = typeof window !== "undefined" && localStorage.getItem(LS_USOU) === "1";
    setJaUsou(usou);
    if (!usou) {
      const t = setTimeout(() => setDica(true), 1200);
      return () => clearTimeout(t);
    }
  }, []);

  useEffect(() => {
    if (aberto) fimRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, aberto, carregando]);

  // Botão "conversar sobre isso" nos comentários do dashboard → abre o chat e pede detalhe.
  useEffect(() => {
    function onAprofundar(e: Event) {
      const d = (e as CustomEvent).detail as { titulo?: string; mes?: string; texto?: string };
      const ctx = d.texto ? ` (observação no painel: "${d.texto}")` : "";
      setPendente(
        `Sobre "${d.titulo ?? "esta análise"}"${d.mes ? ` em ${d.mes}` : ""}${ctx}: me explique melhor e o que eu deveria fazer.`
      );
    }
    window.addEventListener("ia-aprofundar", onAprofundar);
    return () => window.removeEventListener("ia-aprofundar", onAprofundar);
  }, []);

  useEffect(() => {
    if (!pendente) return;
    abrir();
    enviar(pendente);
    setPendente(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendente]);

  function abrir() {
    setAberto(true);
    setDica(false);
    setJaUsou(true);
    if (typeof window !== "undefined") localStorage.setItem(LS_USOU, "1");
  }

  async function enviar(texto: string) {
    const pergunta = texto.trim();
    if (!pergunta || carregando) return;
    setInput("");
    const base: Msg[] = [...msgs, { role: "user", content: pergunta }];
    setMsgs([...base, { role: "assistant", content: "" }]);
    setCarregando(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: base }),
      });

      if (!res.ok || !res.body) {
        let erro = "Não consegui responder agora.";
        try {
          const j = await res.json();
          erro = j.erro ?? erro;
        } catch {}
        setMsgs([...base, { role: "assistant", content: "⚠️ " + erro }]);
        return;
      }

      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let acc = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        acc += dec.decode(value, { stream: true });
        setMsgs([...base, { role: "assistant", content: acc }]);
      }
      if (!acc) setMsgs([...base, { role: "assistant", content: "Não veio resposta. Tente de novo." }]);
    } catch (e) {
      setMsgs([...base, { role: "assistant", content: "⚠️ " + (e instanceof Error ? e.message : "Falha de conexão") }]);
    } finally {
      setCarregando(false);
    }
  }

  return (
    <>
      {/* Balão de convite (1ª visita, até abrir o chat pela 1ª vez) */}
      {dica && !aberto && (
        <div className="fixed bottom-28 right-5 z-50 w-[min(20rem,calc(100vw-2.5rem))] rounded-2xl rounded-br-sm border border-slate-200 bg-white p-4 shadow-2xl">
          <button
            onClick={() => setDica(false)}
            className="absolute right-2 top-2 rounded p-1 text-slate-400 hover:bg-slate-100"
            aria-label="Fechar"
          >
            <X size={14} />
          </button>
          <div className="flex items-center gap-2">
            <IAIcon className="h-8 w-8" />
            <div className="text-sm font-semibold text-[#1f5237]">Fale com o analista 👋</div>
          </div>
          <p className="mt-2 text-[13px] leading-relaxed text-slate-600">
            Tem dúvida sobre os números? Me pergunte: <em>“quais os maiores gastos do mês?”</em>,
            <em> “onde dá pra economizar?”</em>, <em>“compare maio e junho”</em>.
          </p>
          <button
            onClick={abrir}
            className="mt-3 w-full rounded-lg bg-[#2d6a40] px-3 py-2 text-sm font-medium text-white transition hover:bg-[#1a472a]"
          >
            Conversar agora
          </button>
        </div>
      )}

      {/* Botão flutuante + rótulo */}
      <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2">
        {!aberto && (
          <button
            onClick={abrir}
            className="hidden items-center rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-[#1f5237] shadow-md transition hover:border-[#2d6a40] hover:text-[#2d6a40] sm:flex"
          >
            Pergunte à IA
          </button>
        )}
        <button
          onClick={() => (aberto ? setAberto(false) : abrir())}
          aria-label="Abrir chat com o analista"
          className="relative flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-[#1f5237] shadow-lg transition hover:bg-[#143a22] hover:shadow-xl"
        >
          {/* anel pulsante até a 1ª utilização */}
          {!jaUsou && !aberto && (
            <span className="absolute inset-0 animate-ping rounded-full bg-[#2d6a40]/40" />
          )}
          {aberto ? (
            <X size={26} className="text-[#e2e8f0]" />
          ) : (
            <IAIcon className="relative h-12 w-12" />
          )}
        </button>
      </div>

      {/* Painel do chat */}
      {aberto && (
        <div className="fixed bottom-24 right-5 z-50 flex h-[70vh] max-h-[560px] w-[calc(100vw-2.5rem)] max-w-[400px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          <div className="flex items-center gap-2 bg-[#1f5237] px-4 py-3 text-white">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/90">
              <IAIcon className="h-7 w-7" />
            </span>
            <div className="leading-tight">
              <div className="text-sm font-semibold">Analista virtual</div>
              <div className="text-[11px] text-[#e2e8f0]/70">pergunte sobre o extrato</div>
            </div>
            <button onClick={() => setAberto(false)} className="ml-auto rounded-md p-1 text-white/80 hover:bg-white/10" aria-label="Fechar">
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 px-3 py-4">
            {msgs.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                    m.role === "user"
                      ? "rounded-br-sm bg-[#2d6a40] text-white"
                      : "rounded-bl-sm border border-slate-200 bg-white text-slate-700"
                  }`}
                >
                  {m.content || (carregando && i === msgs.length - 1 ? "…" : "")}
                </div>
              </div>
            ))}

            {msgs.length === 1 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {SUGESTOES.map((s) => (
                  <button
                    key={s}
                    onClick={() => enviar(s)}
                    className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs text-slate-600 transition hover:border-[#2d6a40] hover:text-[#2d6a40]"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
            <div ref={fimRef} />
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              enviar(input);
            }}
            className="flex items-center gap-2 border-t border-slate-200 bg-white p-2"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Pergunte sobre as finanças…"
              disabled={carregando}
              className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#2d6a40] disabled:bg-slate-50"
            />
            <button
              type="submit"
              disabled={carregando || !input.trim()}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#2d6a40] text-white transition hover:bg-[#1a472a] disabled:opacity-50"
              aria-label="Enviar"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
