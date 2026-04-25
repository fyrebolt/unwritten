"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { AnimatePresence, motion } from "framer-motion";
import { mockCases } from "@/lib/mock/cases";
import { clearUser } from "@/lib/mock/user";

type Ctx = { open: () => void; close: () => void; isOpen: boolean };
const CommandPaletteContext = createContext<Ctx | null>(null);

export function useCommandPalette(): Ctx {
  const ctx = useContext(CommandPaletteContext);
  if (!ctx) throw new Error("CommandPalette context missing");
  return ctx;
}

export function CommandPaletteProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsOpen((o) => !o);
      }
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const value = useMemo(() => ({ open, close, isOpen }), [open, close, isOpen]);

  return (
    <CommandPaletteContext.Provider value={value}>
      {children}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 z-[60] flex items-start justify-center px-4 pt-24"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onMouseDown={(e) => e.target === e.currentTarget && close()}
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
          >
            <motion.div
              className="absolute inset-0 bg-ink/20 backdrop-blur-[2px]"
              aria-hidden="true"
            />
            <motion.div
              initial={{ y: -8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -8, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="relative w-full max-w-[640px] border border-rule bg-paper shadow-[0_40px_80px_-40px_rgba(28,22,12,0.4)]"
            >
              <Command
                label="Command palette"
                className="flex flex-col"
                shouldFilter={true}
              >
                <Command.Input
                  placeholder="Search cases, or type a command…"
                  className="h-14 w-full border-b border-rule bg-transparent px-5 font-serif text-[17px] text-ink placeholder:text-ink-faint focus:outline-none"
                  autoFocus
                />
                <Command.List className="max-h-[360px] overflow-y-auto p-2">
                  <Command.Empty className="px-4 py-6 font-sans text-[12px] text-ink-muted">
                    Nothing matches.
                  </Command.Empty>
                  <Command.Group heading="Actions">
                    <PaletteItem
                      value="new case create appeal"
                      onSelect={() => {
                        close();
                        router.push("/case/new");
                      }}
                      label="New case"
                      hint="Create a new appeal"
                    />
                    <PaletteItem
                      value="dashboard home"
                      onSelect={() => {
                        close();
                        router.push("/dashboard");
                      }}
                      label="Go to dashboard"
                    />
                    <PaletteItem
                      value="agent configuration tune"
                      onSelect={() => {
                        close();
                        router.push("/settings#agent-config");
                      }}
                      label="Open agent config"
                    />
                    <PaletteItem
                      value="settings profile"
                      onSelect={() => {
                        close();
                        router.push("/settings");
                      }}
                      label="Settings"
                    />
                    <PaletteItem
                      value="sign out logout"
                      onSelect={() => {
                        close();
                        clearUser();
                        router.push("/signin");
                      }}
                      label="Sign out"
                    />
                  </Command.Group>
                  <Command.Group heading="Cases">
                    {mockCases.map((c) => (
                      <PaletteItem
                        key={c.id}
                        value={`${c.title} ${c.insurer} ${c.serviceDenied}`}
                        onSelect={() => {
                          close();
                          router.push(
                            c.completed ? `/case/${c.id}/detail` : `/case/${c.id}`,
                          );
                        }}
                        label={c.title}
                        hint={c.status}
                      />
                    ))}
                  </Command.Group>
                </Command.List>
                <div className="flex items-center justify-between border-t border-rule px-5 py-3 font-sans text-[10px] uppercase tracking-[0.16em] text-ink-faint">
                  <span>Unwritten command palette</span>
                  <span>
                    <kbd className="mr-1">↵</kbd> select · <kbd className="mx-1">esc</kbd> close
                  </span>
                </div>
              </Command>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </CommandPaletteContext.Provider>
  );
}

function PaletteItem({
  value,
  label,
  hint,
  onSelect,
}: {
  value: string;
  label: string;
  hint?: string;
  onSelect: () => void;
}) {
  return (
    <Command.Item
      value={value}
      onSelect={onSelect}
      className="flex cursor-pointer items-center justify-between rounded-[2px] px-3 py-2.5 font-sans text-[13px] text-ink aria-selected:bg-paper-deep aria-selected:text-ink"
    >
      <span>{label}</span>
      {hint && (
        <span className="font-sans text-[10px] uppercase tracking-[0.16em] text-ink-faint">
          {hint}
        </span>
      )}
    </Command.Item>
  );
}
