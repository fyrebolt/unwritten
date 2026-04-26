"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { AnimatePresence, motion } from "framer-motion";
import { useClerk, useUser } from "@clerk/nextjs";
import { getCase } from "@/lib/mock/cases";
import { useCommandPalette } from "./CommandPaletteProvider";

export function TopBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { open: openPalette } = useCommandPalette();
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();

  const displayName = user?.fullName ?? user?.firstName ?? user?.username ?? "Member";
  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  const initials = computeInitials(displayName, email);

  const crumbs = buildCrumbs(pathname);

  return (
    <header className="sticky top-0 z-30 border-b border-rule bg-paper/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-[96rem] items-center gap-6 px-6 md:px-10 lg:px-14">
        <Link
          href="/dashboard"
          className="font-serif text-[1.25rem] leading-none tracking-tight text-ink"
        >
          Unwritten<span className="text-ochre">.</span>
        </Link>

        <nav aria-label="Breadcrumb" className="flex-1">
          {crumbs.length > 0 && (
            <ol className="flex items-center gap-2 font-sans text-[12px] text-ink-muted">
              {crumbs.map((c, i) => (
                <li key={c.href ?? c.label} className="flex items-center gap-2">
                  {i > 0 && <span aria-hidden="true" className="text-ink-faint">/</span>}
                  {c.href && i < crumbs.length - 1 ? (
                    <Link
                      href={c.href}
                      className="transition-colors duration-200 ease-editorial hover:text-ink"
                    >
                      {c.label}
                    </Link>
                  ) : (
                    <span className="text-ink">{c.label}</span>
                  )}
                </li>
              ))}
            </ol>
          )}
        </nav>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={openPalette}
            className="flex items-center gap-2 border border-rule px-3 py-1.5 font-sans text-[11px] uppercase tracking-[0.16em] text-ink-muted transition-colors duration-200 ease-editorial hover:border-ink/20 hover:text-ink"
            aria-label="Open command palette"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <circle cx="5" cy="5" r="3" stroke="currentColor" strokeWidth="1" />
              <path d="M7.5 7.5L10 10" stroke="currentColor" strokeWidth="1" />
            </svg>
            <span>Search</span>
            <kbd className="ml-1 font-sans text-[10px] tracking-[0.1em] text-ink-faint">⌘K</kbd>
          </button>

          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button
                aria-label="Account menu"
                className="group flex h-8 w-8 items-center justify-center rounded-full border border-rule bg-paper-deep font-sans text-[11px] font-medium text-ink transition-colors duration-200 ease-editorial hover:border-ochre"
              >
                {isLoaded ? initials : "·"}
              </button>
            </DropdownMenu.Trigger>
            <AnimatePresence>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  align="end"
                  sideOffset={8}
                  className="z-50 w-[220px] border border-rule bg-paper p-1 shadow-[0_30px_60px_-30px_rgba(28,22,12,0.2)]"
                  asChild
                >
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <div className="px-3 py-3 border-b border-rule">
                      <p className="font-serif text-[15px] text-ink">{displayName}</p>
                      {email && (
                        <p className="mt-0.5 font-sans text-[11px] text-ink-muted">{email}</p>
                      )}
                    </div>
                    <MenuItem onSelect={() => router.push("/settings")}>Settings</MenuItem>
                    <MenuItem onSelect={() => router.push("/settings#agent-config")}>
                      Agent config
                    </MenuItem>
                    <DropdownMenu.Separator className="my-1 h-px bg-rule" />
                    <MenuItem
                      onSelect={() => {
                        void signOut({ redirectUrl: "/signin" });
                      }}
                    >
                      Sign out
                    </MenuItem>
                  </motion.div>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </AnimatePresence>
          </DropdownMenu.Root>
        </div>
      </div>
    </header>
  );
}

function MenuItem({
  children,
  onSelect,
}: {
  children: React.ReactNode;
  onSelect: () => void;
}) {
  return (
    <DropdownMenu.Item
      onSelect={onSelect}
      className="cursor-pointer select-none px-3 py-2 font-sans text-[13px] text-ink outline-none transition-colors duration-150 ease-editorial data-[highlighted]:bg-paper-deep data-[highlighted]:text-ink"
    >
      {children}
    </DropdownMenu.Item>
  );
}

function computeInitials(name: string, email: string): string {
  const source = name.trim() || email.split("@")[0] || "Member";
  const tokens = source.split(/[\s._-]+/).filter(Boolean);
  if (tokens.length === 0) return "·";
  if (tokens.length === 1) return tokens[0].slice(0, 2).toUpperCase();
  return (tokens[0][0] + tokens[1][0]).toUpperCase();
}

type Crumb = { label: string; href?: string };

function buildCrumbs(pathname: string): Crumb[] {
  if (!pathname || pathname === "/dashboard") return [];
  const parts = pathname.split("/").filter(Boolean);
  const crumbs: Crumb[] = [];

  if (parts[0] === "case") {
    crumbs.push({ label: "Cases", href: "/dashboard" });
    const id = parts[1];
    if (id === "new") {
      crumbs.push({ label: "New case" });
      return crumbs;
    }
    const c = id ? getCase(id) : undefined;
    const title = c?.title ?? "Untitled case";
    const caseHref = `/case/${id}`;
    if (parts.length > 2) {
      crumbs.push({ label: title, href: caseHref });
      const leaf = parts[2];
      const leafLabel =
        leaf === "review"
          ? "Review"
          : leaf === "send"
            ? "Send"
            : leaf === "detail"
              ? "Detail"
              : leaf === "live"
                ? "Live agents"
                : leaf;
      crumbs.push({ label: leafLabel });
    } else {
      crumbs.push({ label: title });
    }
    return crumbs;
  }
  if (parts[0] === "settings") {
    crumbs.push({ label: "Settings" });
    return crumbs;
  }
  return crumbs;
}
