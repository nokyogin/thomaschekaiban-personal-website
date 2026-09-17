import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { round2 } from "@/data/debts-data";
import {
  ensureDebtsTables,
  insertPayment,
  updatePayment,
  deletePayment,
} from "@/lib/debts-db";

const UNAUTHORIZED = NextResponse.json({ error: "Unauthorized" }, { status: 401 });

interface PaymentFields {
  date: string;
  amount: number;
  note: string;
}

/** Validates the fields shared by create and update. */
function parseFields(
  body: Record<string, unknown>
): { fields: PaymentFields } | { error: string } {
  const { date, amount, note } = body;

  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { error: "Date must be a YYYY-MM-DD string" };
  }
  if (isNaN(new Date(`${date}T00:00:00Z`).getTime())) {
    return { error: "Date is not a real date" };
  }
  if (typeof amount !== "number" || !isFinite(amount) || amount === 0) {
    return { error: "Amount must be a non-zero number" };
  }

  return {
    fields: {
      date,
      amount: round2(amount),
      note: typeof note === "string" ? note.trim() : "",
    },
  };
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return UNAUTHORIZED;

  try {
    const body = await request.json();
    const debtId = Number(body.debtId);
    if (!Number.isInteger(debtId) || debtId <= 0) {
      return NextResponse.json({ error: "A valid debtId is required" }, { status: 400 });
    }

    const parsed = parseFields(body);
    if ("error" in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    await ensureDebtsTables();
    const payment = await insertPayment({ debtId, ...parsed.fields });
    if (!payment) {
      return NextResponse.json({ error: "Debt not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, payment });
  } catch (e) {
    console.error("Failed to insert payment:", e);
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

    const parsed = parseFields(body);
    if ("error" in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    await ensureDebtsTables();
    const payment = await updatePayment(id, parsed.fields);
    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, payment });
  } catch (e) {
    console.error("Failed to update payment:", e);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return UNAUTHORIZED;

  try {
    const id = Number(request.nextUrl.searchParams.get("id"));
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ error: "A valid id is required" }, { status: 400 });
    }

    await ensureDebtsTables();
    await deletePayment(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Failed to delete payment:", e);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
