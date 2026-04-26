import { notFound } from "next/navigation";
import { ObjectId } from "mongodb";
import { auth } from "@clerk/nextjs/server";
import { getCase as getRealCase } from "@/lib/db/cases";
import { serializeCase } from "@/lib/db/serialize";
import { getCase as getMockCase } from "@/lib/mock/cases";
import { SendClient } from "./SendClient";
import { RealCaseSendClient } from "./RealCaseSendClient";

export const dynamic = "force-dynamic";

export default async function SendPage({
  params,
}: {
  params: { id: string };
}) {
  // Real Mongo case → editorial fax-confirmation flow with the user's actual
  // denial. Mock id (e.g. "case-12") → keep the original demo SendClient so the
  // landing-page case studies still link somewhere sensible.
  if (ObjectId.isValid(params.id) && params.id.length === 24) {
    const { userId } = await auth();
    if (!userId) notFound();
    const c = await getRealCase(userId, params.id);
    if (!c) notFound();
    return <RealCaseSendClient seed={serializeCase(c)} />;
  }

  const c = getMockCase(params.id);
  if (!c) notFound();
  return <SendClient caseItem={c} />;
}
