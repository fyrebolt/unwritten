import { notFound, redirect } from "next/navigation";
import { ObjectId } from "mongodb";
import { getCase } from "@/lib/mock/cases";
import { SendClient } from "./SendClient";

export default function SendPage({ params }: { params: { id: string } }) {
  if (ObjectId.isValid(params.id) && params.id.length === 24) {
    redirect(`/case/${params.id}/live`);
  }
  const c = getCase(params.id);
  if (!c) notFound();
  return <SendClient caseItem={c} />;
}
