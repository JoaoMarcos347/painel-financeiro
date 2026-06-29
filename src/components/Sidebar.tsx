"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Receipt, BookOpenText, Tags, LogOut, X } from "lucide-react";
import { BrandIcon } from "@/components/BrandIcon";
import { BRAND_NAME } from "@/lib/brand";

const links = [
  { href: "/", label: "Visão Geral", icon: LayoutDashboard },
  { href: "/transacoes", label: "Transações", icon: Receipt },
  { href: "/balancete", label: "Balancete", icon: BookOpenText },
  { href: "/regras", label: "Regras / DE-PARA", icon: Tags },
];

export function Sidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();

  // No celular, fecha a gaveta ao navegar; no desktop mantém o menu aberto.
  function fecharSeMobile() {
    if (typeof window !== "undefined" && window.innerWidth < 1024) onClose?.();
  }

  async function sair() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-60 shrink-0 flex-col bg-gradient-to-b from-[#334155] to-[#1e293b] text-[#e2e8f0]/80 lg:static lg:z-auto">
      <div className="relative flex flex-col items-center gap-2 border-b border-white/10 px-5 py-6">
        <button
          onClick={onClose}
          aria-label="Fechar menu"
          className="absolute right-3 top-3 rounded-md p-1 text-white/70 transition hover:bg-white/10 lg:hidden"
        >
          <X size={18} />
        </button>
        <BrandIcon className="h-14 w-14" />
        <div className="text-center leading-none">
          <div className="text-sm font-semibold tracking-[0.25em] text-[#e2e8f0]">{BRAND_NAME.toUpperCase()}</div>
          <div className="mt-1 text-[8px] font-semibold tracking-[0.35em] text-[#2563eb]">
            FINANCEIRO
          </div>
        </div>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        <div className="px-3 pb-2 pt-1 text-[9.5px] font-bold uppercase tracking-[0.2em] text-white/35">
          Painel
        </div>
        {links.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={fecharSeMobile}
              className={`flex items-center gap-3 rounded-lg border-l-2 px-3 py-2 text-sm font-medium transition ${
                active
                  ? "border-[#2563eb] bg-white/10 text-white"
                  : "border-transparent text-[#e2e8f0]/70 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon size={18} className={active ? "text-[#2563eb]" : ""} />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-white/10 p-3">
        <button
          onClick={sair}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-[#e2e8f0]/70 transition hover:bg-white/5 hover:text-white"
        >
          <LogOut size={18} />
          Sair
        </button>
      </div>
    </aside>
  );
}
