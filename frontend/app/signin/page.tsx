import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/AuthShell";
import { AuthForm } from "@/components/auth/AuthForm";

export const metadata: Metadata = {
  title: "Sign in — Unwritten",
};

export default function SignInPage() {
  return (
    <AuthShell mode="signin">
      <AuthForm mode="signin" />
    </AuthShell>
  );
}
