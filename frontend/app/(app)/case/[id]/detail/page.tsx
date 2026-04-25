import { notFound } from "next/navigation";
import { getCase } from "@/lib/mock/cases";
import { DetailClient } from "./DetailClient";

export default function DetailPage({ params }: { params: { id: string } }) {
  const c = getCase(params.id);
  if (!c) notFound();
  return <DetailClient caseItem={c} />;
}
