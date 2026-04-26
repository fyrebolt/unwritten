import type { Metadata } from "next";
import { SignIn } from "@clerk/nextjs";
import { AuthShell } from "@/components/auth/AuthShell";

export const metadata: Metadata = {
  title: "Sign in — Unwritten",
};

export default function SignInPage() {
  return (
    <AuthShell mode="signin">
      <SignIn signUpUrl="/signup" forceRedirectUrl="/dashboard" />
    </AuthShell>
  );
}
