import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ensureTable, getAllRecords, upsertRecords, deleteAllRecords } from "@/lib/db";
import { HealthRecord } from "@/data/health-data";

const UNAUTHORIZED = NextResponse.json({ error: "Unauthorized" }, { status: 401 });

// GET /api/health — fetch all records from DB
export async function GET() {
  const session = await auth();
  if (!session?.user) return UNAUTHORIZED;

  try {
    await ensureTable();
    const records = await getAllRecords();
    return NextResponse.json({ records });
  } catch (e) {
    console.error("Failed to fetch health records:", e);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

// POST /api/health — upload records (replaces all data)
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return UNAUTHORIZED;

  try {
    const body = await request.json();
    const records: HealthRecord[] = body.records;

    if (!Array.isArray(records) || records.length === 0) {
      return NextResponse.json({ error: "No records provided" }, { status: 400 });
    }

    await ensureTable();
    await deleteAllRecords();
    const count = await upsertRecords(records);

    return NextResponse.json({ ok: true, count });
  } catch (e) {
    console.error("Failed to upload health records:", e);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

// DELETE /api/health — clear all records
export async function DELETE() {
  const session = await auth();
  if (!session?.user) return UNAUTHORIZED;

  try {
    await ensureTable();
    await deleteAllRecords();
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Failed to delete health records:", e);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
