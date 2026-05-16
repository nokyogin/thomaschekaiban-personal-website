import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ensureRollTable, getAllRolls, insertRoll, deleteRoll, deleteAllRolls } from "@/lib/roll-db";

const UNAUTHORIZED = NextResponse.json({ error: "Unauthorized" }, { status: 401 });

export async function GET() {
  const session = await auth();
  if (!session?.user) return UNAUTHORIZED;

  try {
    await ensureRollTable();
    const rolls = await getAllRolls();
    return NextResponse.json({ rolls });
  } catch (e) {
    console.error("Failed to fetch rolls:", e);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

export async function POST() {
  const session = await auth();
  if (!session?.user) return UNAUTHORIZED;

  try {
    await ensureRollTable();
    const entry = await insertRoll();
    return NextResponse.json({ entry });
  } catch (e) {
    console.error("Failed to insert roll:", e);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return UNAUTHORIZED;

  try {
    await ensureRollTable();
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (id) {
      await deleteRoll(parseInt(id));
    } else {
      await deleteAllRolls();
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Failed to delete roll:", e);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
