import { NextRequest, NextResponse } from "next/server";
import { ensureTable, getAllRecords, upsertRecords, deleteAllRecords } from "@/lib/db";
import { HealthRecord } from "@/data/health-data";

// GET /api/health — fetch all records from DB
export async function GET() {
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
  try {
    await ensureTable();
    await deleteAllRecords();
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Failed to delete health records:", e);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
