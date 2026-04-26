/**
 * Idempotent: ensures a Mongo `users` doc exists for the current Clerk user.
 * Called from the dashboard on first paint so the rest of the app can rely on
 * { clerkUserId } as a foreign key without nil-checks downstream.
 *
 * Always returns JSON, including on DB outages, so the client never has to
 * defensively parse HTML error pages.
 */
import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { ensureUser } from "@/lib/db/users";
import { describeMongoError, isMongoUnreachableError } from "@/lib/mongo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { ok: false, error: "unauthorized" },
        { status: 401 },
      );
    }
    const cu = await currentUser();
    const email = cu?.primaryEmailAddress?.emailAddress;
    const displayName =
      cu?.fullName ?? cu?.firstName ?? cu?.username ?? email?.split("@")[0];
    const user = await ensureUser({ clerkUserId: userId, email, displayName });
    return NextResponse.json({ ok: true, user: serializeUser(user) });
  } catch (err) {
    const status = isMongoUnreachableError(err) ? 503 : 500;
    console.error("[api/users/sync] error:", err);
    return NextResponse.json(
      { ok: false, error: describeMongoError(err) },
      { status },
    );
  }
}

function serializeUser(u: Awaited<ReturnType<typeof ensureUser>>) {
  return {
    id: u._id?.toString(),
    clerkUserId: u.clerkUserId,
    email: u.email,
    displayName: u.displayName,
  };
}
