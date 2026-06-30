"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { IS_DEMO } from "@/lib/brand";

export function SyncButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [erro, setErro] = useState(false);

  async function run() {
    setLoading(true);
    setMsg(null);
    setErro(false);
    try {
      const r = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const j = await r.json();
      if (j.ok) {
        setMsg(`${j.transacoes} transações · ${j.contas} contas`);
        router.refresh();
      } else {
        setErro(true);
        setMsg(j.erro ?? "Falha na sincronização");
      }
    } catch (e) {
      setErro(true);
      setMsg(e instanceof Error ? e.message : "Falha na sincronização");
    } finally {
      setLoading(false);
    }
  }

  if (IS_DEMO) return null;

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={run}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-lg bg-[#2d6a40] px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-[#1a472a] disabled:opacity-60"
      >
        <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
        {loading ? "Sincronizando…" : "Sincronizar"}
      </button>
      {msg && (
        <span className={`text-sm ${erro ? "text-red-600" : "text-slate-500"}`}>{msg}</span>
      )}
    </div>
  );
}
