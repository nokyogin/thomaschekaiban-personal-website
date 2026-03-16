import { NextRequest, NextResponse } from "next/server";
import {
  ensureWealthTable,
  getAllWealthEntries,
  insertWealthEntry,
  deleteAllWealthEntries,
} from "@/lib/wealth-db";

export async function GET() {
  try {
    await ensureWealthTable();
    const entries = await getAllWealthEntries();
    return NextResponse.json({ entries });
  } catch (e) {
    console.error("Failed to fetch wealth entries:", e);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { category, amount } = body;

    if (!category || typeof category !== "string" || !category.trim()) {
      return NextResponse.json({ error: "Category is required" }, { status: 400 });
    }
    if (typeof amount !== "number" || !isFinite(amount)) {
      return NextResponse.json({ error: "Amount must be a valid number" }, { status: 400 });
    }

    await ensureWealthTable();
    const entry = await insertWealthEntry(category.trim(), amount);
    return NextResponse.json({ ok: true, entry });
  } catch (e) {
    console.error("Failed to insert wealth entry:", e);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    await ensureWealthTable();
    await deleteAllWealthEntries();
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Failed to delete wealth entries:", e);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
