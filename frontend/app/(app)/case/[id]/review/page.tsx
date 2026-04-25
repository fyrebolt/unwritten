import { notFound } from "next/navigation";
import { getCase } from "@/lib/mock/cases";
import { ReviewClient } from "./ReviewClient";

export default function ReviewPage({ params }: { params: { id: string } }) {
  const c = getCase(params.id);
  if (!c) notFound();
  return <ReviewClient caseItem={c} />;
}
