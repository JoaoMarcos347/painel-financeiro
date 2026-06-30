"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { Sidebar } from "@/components/Sidebar";
import { ChatWidget } from "@/components/ChatWidget";
import { BrandIcon } from "@/components/BrandIcon";
import { BRAND_NAME } from "@/lib/brand";

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [menuAberto, setMenuAberto] = useState(false);

  // Abre por padrão no desktop; fica fechado no celular (vira gaveta).
  useEffect(() => {
    setMenuAberto(window.innerWidth >= 1024);
  }, []);

  if (pathname === "/login") return <>{children}</>;

  return (
    <div className="flex min-h-screen">
      {menuAberto && <Sidebar onClose={() => setMenuAberto(false)} />}

      {/* Fundo escuro (só no celular, quando a gaveta está aberta) */}
      {menuAberto && (
        <div
          onClick={() => setMenuAberto(false)}
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          aria-hidden
        />
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Barra de topo com botão de mostrar/ocultar o menu */}
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-slate-200 bg-white/95 px-3 py-2 backdrop-blur">
          <button
            onClick={() => setMenuAberto((v) => !v)}
            aria-label="Mostrar ou ocultar o menu"
            className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2 lg:hidden">
            <BrandIcon className="h-7 w-7" />
            <span className="text-sm font-bold tracking-wide text-[#1f5237]">{BRAND_NAME.toUpperCase()}</span>
          </div>
        </header>

        <main className="min-w-0 flex-1 px-4 py-5 pb-24 sm:px-6 lg:px-8">{children}</main>
      </div>

      <ChatWidget />
    </div>
  );
}
