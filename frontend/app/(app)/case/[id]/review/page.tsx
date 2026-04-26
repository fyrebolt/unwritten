import { notFound, redirect } from "next/navigation";
import { ObjectId } from "mongodb";
import { getCase } from "@/lib/mock/cases";
import { ReviewClient } from "./ReviewClient";

export default function ReviewPage({ params }: { params: { id: string } }) {
  // Real Mongo case → skip the legacy debug review page and go straight to
  // the editorial fax-confirmation flow. The agents already drafted the letter
  // during the cinematic; the next user action is "send", not "edit".
  if (ObjectId.isValid(params.id) && params.id.length === 24) {
    redirect(`/case/${params.id}/send`);
  }
  const c = getCase(params.id);
  if (!c) notFound();
  return <ReviewClient caseItem={c} />;
}
