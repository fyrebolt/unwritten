"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function Drawer({
  open,
  onOpenChange,
  children,
  width = 480,
  label,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  children: React.ReactNode;
  width?: number;
  label: string;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                className="fixed inset-0 z-50 bg-ink/20 backdrop-blur-[2px]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              />
            </Dialog.Overlay>
            <Dialog.Content
              asChild
              onOpenAutoFocus={(e) => e.preventDefault()}
              aria-label={label}
            >
              <motion.aside
                className="fixed right-0 top-0 z-50 flex h-dvh flex-col border-l border-rule bg-paper shadow-[-30px_0_60px_-30px_rgba(0,0,0,0.2)]"
                style={{ width }}
                initial={{ x: width + 40 }}
                animate={{ x: 0 }}
                exit={{ x: width + 40 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              >
                {children}
              </motion.aside>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}

export function DrawerHeader({
  eyebrow,
  title,
  subtitle,
  onClose,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  onClose: () => void;
}) {
  return (
    <header className="border-b border-rule px-8 pb-6 pt-8">
      <div className="flex items-start justify-between">
        <div>
          <p className="mb-3 font-sans text-[11px] uppercase tracking-[0.22em] text-ink-muted">
            {eyebrow}
          </p>
          <Dialog.Title className="font-serif text-[2rem] leading-[1.05] tracking-tight text-ink">
            {title}
          </Dialog.Title>
        </div>
        <button
          aria-label="Close"
          onClick={onClose}
          className="mt-1 text-ink-muted transition-colors duration-200 ease-editorial hover:text-ink"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M5 5L15 15M15 5L5 15" stroke="currentColor" strokeWidth="1.2" />
          </svg>
        </button>
      </div>
      {subtitle && (
        <Dialog.Description className="mt-4 font-serif text-[0.95rem] leading-[1.55] text-ink-muted">
          {subtitle}
        </Dialog.Description>
      )}
    </header>
  );
}

export function DrawerBody({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex-1 overflow-y-auto px-8 py-6", className)}>
      {children}
    </div>
  );
}

export function DrawerFooter({ children }: { children: React.ReactNode }) {
  return (
    <footer className="border-t border-rule px-8 py-5">
      <div className="flex items-center justify-between">{children}</div>
    </footer>
  );
}
