import { notFound } from "next/navigation";
import { ObjectId } from "mongodb";
import { auth } from "@clerk/nextjs/server";
import { getCase } from "@/lib/db/cases";
import { serializeCase } from "@/lib/db/serialize";
import { LiveAgentsClient } from "./LiveAgentsClient";

export const dynamic = "force-dynamic";

export default async function LiveAgentsPage({
  params,
}: {
  params: { id: string };
}) {
  const { userId } = await auth();
  if (!userId) notFound();
  if (!ObjectId.isValid(params.id) || params.id.length !== 24) notFound();
  const c = await getCase(userId, params.id);
  if (!c) notFound();
  return <LiveAgentsClient seed={serializeCase(c)} />;
}
