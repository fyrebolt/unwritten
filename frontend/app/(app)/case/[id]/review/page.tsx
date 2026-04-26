import { notFound, redirect } from "next/navigation";
import { ObjectId } from "mongodb";
import { getCase } from "@/lib/mock/cases";
import { ReviewClient } from "./ReviewClient";

export default function ReviewPage({ params }: { params: { id: string } }) {
  // Real Mongo case → the live agents page is the canonical "review the draft"
  // surface (the legacy ReviewClient was hardcoded for the mock data shape).
  if (ObjectId.isValid(params.id) && params.id.length === 24) {
    redirect(`/case/${params.id}/live`);
  }
  const c = getCase(params.id);
  if (!c) notFound();
  return <ReviewClient caseItem={c} />;
}
