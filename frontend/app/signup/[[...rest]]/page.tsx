import type { Metadata } from "next";
import { SignUp } from "@clerk/nextjs";
import { AuthShell } from "@/components/auth/AuthShell";

export const metadata: Metadata = {
  title: "Create an account — Unwritten",
};

export default function SignUpPage() {
  return (
    <AuthShell mode="signup">
      <SignUp signInUrl="/signin" forceRedirectUrl="/dashboard" />
    </AuthShell>
  );
}
