import { notFound, redirect } from "next/navigation";
import { ObjectId } from "mongodb";
import { auth } from "@clerk/nextjs/server";
import { getCase as getMockCase } from "@/lib/mock/cases";
import { getCase as getRealCase } from "@/lib/db/cases";
import { serializeCase } from "@/lib/db/serialize";
import { isCompleted } from "@/lib/cases/format";
import { CaseWorkspaceClient } from "./CaseWorkspaceClient";

export const dynamic = "force-dynamic";

export default async function CaseWorkspacePage({
  params,
}: {
  params: { id: string };
}) {
  const { userId } = await auth();

  // Real Mongo cases (id is a 24-char ObjectId hex). The mock fixtures used
  // names like `case_847221b`, so we can dispatch on shape.
  if (userId && ObjectId.isValid(params.id) && params.id.length === 24) {
    const real = await getRealCase(userId, params.id);
    if (!real) notFound();
    if (isCompleted(real.status)) {
      redirect(`/case/${params.id}/detail`);
    }
    const seed = serializeCase(real);
    return (
      <CaseWorkspaceClient
        caseId={params.id}
        title={seed.title}
        seed={seed}
      />
    );
  }

  // Legacy mock case (e.g. for the demo fixtures linked from the landing page).
  const mock = getMockCase(params.id);
  if (!mock) notFound();
  if (mock.completed) redirect(`/case/${mock.id}/detail`);
  return (
    <CaseWorkspaceClient caseId={mock.id} title={mock.title} />
  );
}
