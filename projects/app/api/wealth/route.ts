import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  ensureWealthTable,
  getAllWealthEntries,
  insertWealthEntry,
  deleteAllWealthEntries,
  renameWealthCategory,
} from "@/lib/wealth-db";

const UNAUTHORIZED = NextResponse.json({ error: "Unauthorized" }, { status: 401 });

export async function GET() {
  const session = await auth();
  if (!session?.user) return UNAUTHORIZED;

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
  const session = await auth();
  if (!session?.user) return UNAUTHORIZED;

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

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return UNAUTHORIZED;

  try {
    const body = await request.json();
    const { oldCategory, newCategory } = body;

    if (!oldCategory || typeof oldCategory !== "string" || !oldCategory.trim()) {
      return NextResponse.json({ error: "Old category name is required" }, { status: 400 });
    }
    if (!newCategory || typeof newCategory !== "string" || !newCategory.trim()) {
      return NextResponse.json({ error: "New category name is required" }, { status: 400 });
    }

    await ensureWealthTable();
    await renameWealthCategory(oldCategory.trim(), newCategory.trim());
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Failed to rename wealth category:", e);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user) return UNAUTHORIZED;

  try {
    await ensureWealthTable();
    await deleteAllWealthEntries();
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Failed to delete wealth entries:", e);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
