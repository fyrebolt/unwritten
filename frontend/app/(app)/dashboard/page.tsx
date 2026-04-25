import { DashboardClient } from "./DashboardClient";
import { getActiveCases, getCompletedCases } from "@/lib/mock/cases";

export default function DashboardPage() {
  return (
    <DashboardClient
      active={getActiveCases()}
      completed={getCompletedCases()}
    />
  );
}
