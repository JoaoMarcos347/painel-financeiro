"use client";

import { useState } from "react";
import { BRAND_NAME } from "@/lib/brand";

/**
 * Logo do painel. Usa o arquivo em /public quando existir
 * (logo.png ou icon.png); senão, mostra o wordmark estilizado da marca.
 */
export function BrandLogo({
  variant = "full",
  className = "",
}: {
  variant?: "full" | "icon";
  className?: string;
}) {
  const [ok, setOk] = useState(true);
  const src = variant === "icon" ? "/icon.png" : "/logo.png";

  if (ok) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={BRAND_NAME}
        onError={() => setOk(false)}
        className={className}
      />
    );
  }

  return (
    <div className="text-center leading-none">
      <div className="text-2xl font-semibold tracking-[0.28em] text-[#e2e8f0]">{BRAND_NAME.toUpperCase()}</div>
      <div className="mt-1 text-[10px] font-semibold tracking-[0.4em] text-[#2563eb]">
        FINANCEIRO
      </div>
    </div>
  );
}
