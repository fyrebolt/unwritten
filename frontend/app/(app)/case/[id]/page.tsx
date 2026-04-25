import { notFound, redirect } from "next/navigation";
import { getCase } from "@/lib/mock/cases";
import { CaseWorkspaceClient } from "./CaseWorkspaceClient";

export default function CaseWorkspacePage({ params }: { params: { id: string } }) {
  const c = getCase(params.id);
  if (!c) notFound();
  if (c.completed) redirect(`/case/${c.id}/detail`);
  return <CaseWorkspaceClient caseItem={c} />;
}
