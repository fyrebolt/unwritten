import type { Metadata } from "next";
import { AgentTestClient } from "./AgentTestClient";

export const metadata: Metadata = { title: "Agent Test" };

export default function AgentTestPage() {
  return <AgentTestClient />;
}
