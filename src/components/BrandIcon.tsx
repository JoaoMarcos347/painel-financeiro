"use client";

import { useState } from "react";
import { BRAND_NAME } from "@/lib/brand";

/** Ícone da marca: usa /public/icon.png quando existir; senão, um monograma de reserva. */
export function BrandIcon({ className = "" }: { className?: string }) {
  const [ok, setOk] = useState(true);
  if (ok) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src="/icon.png"
        alt={BRAND_NAME}
        onError={() => setOk(false)}
        className={className}
      />
    );
  }
  const letra = (BRAND_NAME.trim()[0] || "P").toUpperCase();
  return (
    <svg viewBox="0 0 200 200" className={className} aria-hidden>
      <circle cx="100" cy="100" r="92" fill="currentColor" opacity="0.12" />
      <circle cx="100" cy="100" r="84" fill="none" stroke="currentColor" strokeWidth="6" opacity="0.5" />
      <text x="100" y="108" textAnchor="middle" fontSize="96" fontWeight="700" fill="currentColor">
        {letra}
      </text>
    </svg>
  );
}
