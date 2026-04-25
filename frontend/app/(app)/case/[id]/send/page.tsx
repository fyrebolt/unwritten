import { notFound } from "next/navigation";
import { getCase } from "@/lib/mock/cases";
import { SendClient } from "./SendClient";

export default function SendPage({ params }: { params: { id: string } }) {
  const c = getCase(params.id);
  if (!c) notFound();
  return <SendClient caseItem={c} />;
}
