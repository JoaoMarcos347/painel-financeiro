import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const runtime = "nodejs";

// Traduz o tipo de regra de PT (usado na tela) para EN (valores do banco novo).
const PT_TO_EN: Record<string, string> = {
  doc: "doc",
  palavra: "keyword",
  categoria: "category",
  interna: "internal",
};

export async function POST(req: Request) {
  try {
    const b = await req.json();
    const tipo_match = String(b.tipo_match ?? "");
    const valor_match = String(b.valor_match ?? "").trim();
    if (!PT_TO_EN[tipo_match])
      return NextResponse.json({ ok: false, erro: "tipo_match inválido" }, { status: 400 });
    if (!valor_match)
      return NextResponse.json({ ok: false, erro: "valor_match vazio" }, { status: 400 });
    if (!b.conta_nome)
      return NextResponse.json({ ok: false, erro: "conta_nome obrigatório" }, { status: 400 });

    await query(
      `insert into rules (match_type, match_value, account_code, account_name, priority)
       values ($1,$2,$3,$4,$5)`,
      [
        PT_TO_EN[tipo_match],
        valor_match,
        b.conta_codigo || null,
        String(b.conta_nome),
        Number(b.prioridade ?? 8),
      ]
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ ok: false, erro: "id ausente" }, { status: 400 });
    await query(`delete from rules where id = $1`, [id]);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
