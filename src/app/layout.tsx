import type { Metadata } from "next";
import { Fraunces, Hanken_Grotesk } from "next/font/google";
import "./globals.css";
import { Shell } from "@/components/Shell";
import { BRAND_NAME } from "@/lib/brand";

const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", display: "swap" });
const hanken = Hanken_Grotesk({ subsets: ["latin"], variable: "--font-hanken", display: "swap" });

export const metadata: Metadata = {
  title: `Painel Financeiro — ${BRAND_NAME}`,
  description: "Balancete gerencial e extrato Open Finance",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`h-full antialiased ${fraunces.variable} ${hanken.variable}`}>
      <body className="min-h-full">
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
