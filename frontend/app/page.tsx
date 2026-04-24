import { Hero } from "@/components/Hero";
import { StatsStrip } from "@/components/StatsStrip";
import { HowItWorks } from "@/components/HowItWorks";
import { PullQuote } from "@/components/PullQuote";
import { Pricing } from "@/components/Pricing";
import { Footer } from "@/components/Footer";
import { TopNav } from "@/components/TopNav";

export default function Home() {
  return (
    <main className="relative">
      <TopNav />
      <Hero />
      <StatsStrip />
      <HowItWorks />
      <PullQuote />
      <Pricing />
      <Footer />
    </main>
  );
}
