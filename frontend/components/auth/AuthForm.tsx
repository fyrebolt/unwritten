"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { signIn, signUp } from "@/lib/auth";

const fieldStagger = (i: number) => ({
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: i * 0.08 },
});

export function AuthForm({ mode }: { mode: "signin" | "signup" }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSignup = mode === "signup";

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Email and password are required.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      if (isSignup) {
        await signUp({ email, password });
      } else {
        await signIn({ email, password });
      }
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-10">
      <motion.div {...fieldStagger(0)} className="space-y-2">
        <p className="font-sans text-[11px] uppercase tracking-[0.22em] text-ink-muted">
          {isSignup ? "Create your workspace" : "Welcome back"}
        </p>
        <h1 className="font-serif text-[2rem] leading-[1.08] tracking-tight text-ink">
          {isSignup ? "Begin a new record." : "Continue where you left off."}
        </h1>
      </motion.div>

      <div className="flex flex-col gap-7">
        <motion.div {...fieldStagger(1)} className="flex flex-col gap-2">
          <label
            htmlFor="email"
            className="font-sans text-[10px] uppercase tracking-[0.22em] text-ink-muted"
          >
            Email
          </label>
          <Input
            id="email"
            type="email"
            sizeVariant="lg"
            autoComplete="email"
            placeholder="you@clinic.org"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </motion.div>

        <motion.div {...fieldStagger(2)} className="flex flex-col gap-2">
          <label
            htmlFor="password"
            className="font-sans text-[10px] uppercase tracking-[0.22em] text-ink-muted"
          >
            Password
            {isSignup && (
              <span className="ml-2 normal-case tracking-normal text-ink-faint">
                (8+ characters)
              </span>
            )}
          </label>
          <Input
            id="password"
            type="password"
            sizeVariant="lg"
            autoComplete={isSignup ? "new-password" : "current-password"}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={isSignup ? 8 : undefined}
          />
        </motion.div>
      </div>

      {error && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="-mt-4 border border-red-300 bg-red-50 px-3 py-2 font-sans text-[12px] leading-relaxed text-red-900"
          role="alert"
        >
          {error}
        </motion.p>
      )}

      <motion.div {...fieldStagger(3)} className="flex flex-col gap-5">
        <Button
          type="submit"
          variant="primary"
          size="lg"
          disabled={submitting}
          className="w-full"
        >
          {submitting
            ? isSignup
              ? "Creating your account…"
              : "Signing you in…"
            : "Continue"}
        </Button>
      </motion.div>

      <motion.p
        {...fieldStagger(4)}
        className="text-center font-sans text-[12px] text-ink-muted"
      >
        {isSignup ? (
          <>
            Already have an account?{" "}
            <Link
              href="/signin"
              className="text-ink underline decoration-ochre underline-offset-4 transition-colors duration-200 ease-editorial hover:text-ochre"
            >
              Sign in
            </Link>
          </>
        ) : (
          <>
            New to Unwritten?{" "}
            <Link
              href="/signup"
              className="text-ink underline decoration-ochre underline-offset-4 transition-colors duration-200 ease-editorial hover:text-ochre"
            >
              Create an account
            </Link>
          </>
        )}
      </motion.p>
    </form>
  );
}
