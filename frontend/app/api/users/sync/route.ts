/**
 * Idempotent: ensures a Mongo `users` doc exists for the current Clerk user.
 * Called from the dashboard on first paint so the rest of the app can rely on
 * { clerkUserId } as a foreign key without nil-checks downstream.
 */
import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { ensureUser } from "@/lib/db/users";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const cu = await currentUser();
  const email = cu?.primaryEmailAddress?.emailAddress;
  const displayName =
    cu?.fullName ?? cu?.firstName ?? cu?.username ?? email?.split("@")[0];
  const user = await ensureUser({ clerkUserId: userId, email, displayName });
  return NextResponse.json({ ok: true, user: serializeUser(user) });
}

function serializeUser(u: Awaited<ReturnType<typeof ensureUser>>) {
  return {
    id: u._id?.toString(),
    clerkUserId: u.clerkUserId,
    email: u.email,
    displayName: u.displayName,
  };
}
