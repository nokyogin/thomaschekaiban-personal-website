import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { round2 } from "@/data/debts-data";
import {
  ensureDebtsTables,
  seedDebtsIfEmpty,
  getAllDebts,
  insertDebt,
  updateDebt,
  deleteDebt,
  deleteAllDebts,
  DebtInput,
} from "@/lib/debts-db";

const UNAUTHORIZED = NextResponse.json({ error: "Unauthorized" }, { status: 401 });

/** Validates a request body into a DebtInput, or returns an error message. */
function parseInput(
  body: Record<string, unknown>
): { input: DebtInput } | { error: string } {
  const { name, initialAmount, notes } = body;

  if (typeof name !== "string" || !name.trim()) {
    return { error: "Name is required" };
  }
  if (typeof initialAmount !== "number" || !isFinite(initialAmount)) {
    return { error: "Initial amount must be a number" };
  }

  return {
    input: {
      name: name.trim(),
      initialAmount: round2(initialAmount),
      notes: typeof notes === "string" ? notes.trim() : "",
    },
  };
}

export async function GET() {
  const session = await auth();
  if (!session?.user) return UNAUTHORIZED;

  try {
    await ensureDebtsTables();
    await seedDebtsIfEmpty();
    const debts = await getAllDebts();
    return NextResponse.json({ debts });
  } catch (e) {
    console.error("Failed to fetch debts:", e);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return UNAUTHORIZED;

  try {
    const parsed = parseInput(await request.json());
    if ("error" in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    await ensureDebtsTables();
    const debt = await insertDebt(parsed.input);
    return NextResponse.json({ ok: true, debt });
  } catch (e) {
    console.error("Failed to insert debt:", e);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return UNAUTHORIZED;

  try {
    const body = await request.json();
    const id = Number(body.id);
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ error: "A valid id is required" }, { status: 400 });
    }

    const parsed = parseInput(body);
    if ("error" in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    await ensureDebtsTables();
    const debt = await updateDebt(id, parsed.input);
    if (!debt) {
      return NextResponse.json({ error: "Debt not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, debt });
  } catch (e) {
    console.error("Failed to update debt:", e);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return UNAUTHORIZED;

  try {
    const idParam = request.nextUrl.searchParams.get("id");
    await ensureDebtsTables();

    if (idParam === null) {
      await deleteAllDebts();
      return NextResponse.json({ ok: true });
    }

    const id = Number(idParam);
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ error: "A valid id is required" }, { status: 400 });
    }
    await deleteDebt(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Failed to delete debt:", e);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
