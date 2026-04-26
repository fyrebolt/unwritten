import { notFound, redirect } from "next/navigation";
import { ObjectId } from "mongodb";
import { getCase } from "@/lib/mock/cases";
import { DetailClient } from "./DetailClient";

export default function DetailPage({ params }: { params: { id: string } }) {
  if (ObjectId.isValid(params.id) && params.id.length === 24) {
    redirect(`/case/${params.id}/live`);
  }
  const c = getCase(params.id);
  if (!c) notFound();
  return <DetailClient caseItem={c} />;
}
