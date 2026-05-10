import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { requirePlayable } from "@/server/auth/guard";
import { PlayDiceInput, playDiceRound } from "@/server/games/play";
import { InsufficientFundsError } from "@/server/wallet/ledger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const session = await requirePlayable();
    const body = PlayDiceInput.parse(await req.json());
    const result = await playDiceRound(session.sub, body);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof Response) return err;
    if (err instanceof ZodError) {
      return NextResponse.json({ error: "invalid_input", issues: err.issues }, { status: 400 });
    }
    if (err instanceof InsufficientFundsError) {
      return NextResponse.json({ error: "insufficient_funds" }, { status: 402 });
    }
    console.error("dice route failed", err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
