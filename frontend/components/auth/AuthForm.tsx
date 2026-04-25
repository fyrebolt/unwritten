"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { setUser } from "@/lib/mock/user";

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

  const isSignup = mode === "signup";

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSubmitting(true);
    setUser(email);
    setTimeout(() => router.push("/dashboard"), 420);
  };

  const onGoogle = () => {
    setSubmitting(true);
    setUser("sarah.reyes@gmail.com");
    setTimeout(() => router.push("/dashboard"), 420);
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
          </label>
          <Input
            id="password"
            type="password"
            sizeVariant="lg"
            autoComplete={isSignup ? "new-password" : "current-password"}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </motion.div>
      </div>

      <motion.div {...fieldStagger(3)} className="flex flex-col gap-5">
        <Button
          type="submit"
          variant="primary"
          size="lg"
          disabled={submitting}
          className="w-full"
        >
          {submitting ? "Signing you in…" : "Continue"}
        </Button>

        <div className="flex items-center gap-4">
          <span className="h-px flex-1 bg-rule" />
          <span className="font-sans text-[10px] uppercase tracking-[0.22em] text-ink-faint">
            or
          </span>
          <span className="h-px flex-1 bg-rule" />
        </div>

        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={onGoogle}
          disabled={submitting}
          className="w-full"
        >
          <GoogleGlyph />
          Continue with Google
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

function GoogleGlyph() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M13.5 7.15c0-.5-.04-.87-.14-1.26H7v2.28h3.73c-.08.62-.5 1.56-1.43 2.2l-.01.08 2.07 1.6.14.02c1.32-1.21 2-2.99 2-4.92Z"
        fill="currentColor"
      />
      <path
        d="M7 14c1.89 0 3.47-.62 4.63-1.69l-2.2-1.7c-.59.4-1.38.69-2.43.69a4.2 4.2 0 0 1-3.98-2.9l-.08.01-2.16 1.67-.03.08A7 7 0 0 0 7 14Z"
        fill="currentColor"
      />
      <path
        d="M3.02 8.4A4.3 4.3 0 0 1 2.78 7c0-.49.08-.96.22-1.4l-.01-.1L.82 3.83l-.07.03A7 7 0 0 0 0 7c0 1.13.27 2.2.75 3.14L3.02 8.4Z"
        fill="currentColor"
      />
      <path
        d="M7 2.78c1.33 0 2.23.58 2.75 1.06l2-1.96C10.47.7 8.89 0 7 0A7 7 0 0 0 .75 3.86L3.01 5.6A4.21 4.21 0 0 1 7 2.78Z"
        fill="currentColor"
      />
    </svg>
  );
}
