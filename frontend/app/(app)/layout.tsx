import { Toaster } from "sonner";
import { TopBar } from "@/components/shell/TopBar";
import { CommandPaletteProvider } from "@/components/shell/CommandPaletteProvider";
import { PageTransition } from "@/components/ui/PageTransition";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <CommandPaletteProvider>
      <div className="flex min-h-dvh flex-col">
        <TopBar />
        <main className="flex-1">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
      <Toaster
        position="bottom-right"
        toastOptions={{
          classNames: {
            toast:
              "border border-rule bg-paper text-ink shadow-[0_30px_60px_-30px_rgba(28,22,12,0.25)]",
            title: "font-serif text-[14px]",
            description: "font-sans text-[12px] text-ink-muted",
          },
        }}
      />
    </CommandPaletteProvider>
  );
}
