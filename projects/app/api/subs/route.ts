import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  ensureSubsTable,
  getAllSubscriptions,
  insertSubscription,
  updateSubscription,
  deleteSubscription,
  deleteAllSubscriptions,
  SubscriptionInput,
} from "@/lib/subs-db";

const UNAUTHORIZED = NextResponse.json({ error: "Unauthorized" }, { status: 401 });

/** Validates a request body into a SubscriptionInput, or returns an error message. */
function parseInput(
  body: Record<string, unknown>
): { input: SubscriptionInput } | { error: string } {
  const { name, price, cycle, category, notes } = body;

  if (typeof name !== "string" || !name.trim()) {
    return { error: "Name is required" };
  }
  if (typeof price !== "number" || !isFinite(price) || price < 0) {
    return { error: "Price must be a positive number" };
  }
  if (cycle !== "monthly" && cycle !== "yearly") {
    return { error: "Cycle must be 'monthly' or 'yearly'" };
  }

  return {
    input: {
      name: name.trim(),
      price: Math.round(price * 100) / 100,
      cycle,
      category: typeof category === "string" ? category.trim() : "",
      notes: typeof notes === "string" ? notes.trim() : "",
    },
  };
}

export async function GET() {
  const session = await auth();
  if (!session?.user) return UNAUTHORIZED;

  try {
    await ensureSubsTable();
    const subscriptions = await getAllSubscriptions();
    return NextResponse.json({ subscriptions });
  } catch (e) {
    console.error("Failed to fetch subscriptions:", e);
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

    await ensureSubsTable();
    const subscription = await insertSubscription(parsed.input);
    return NextResponse.json({ ok: true, subscription });
  } catch (e) {
    console.error("Failed to insert subscription:", e);
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

    await ensureSubsTable();
    const subscription = await updateSubscription(id, parsed.input);
    if (!subscription) {
      return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, subscription });
  } catch (e) {
    console.error("Failed to update subscription:", e);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return UNAUTHORIZED;

  try {
    const idParam = request.nextUrl.searchParams.get("id");
    await ensureSubsTable();

    if (idParam === null) {
      await deleteAllSubscriptions();
      return NextResponse.json({ ok: true });
    }

    const id = Number(idParam);
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ error: "A valid id is required" }, { status: 400 });
    }
    await deleteSubscription(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Failed to delete subscription:", e);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
