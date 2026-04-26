import { Hero } from "@/components/Hero";
import { StatsStrip } from "@/components/StatsStrip";
import { HowItWorks } from "@/components/HowItWorks";
import { Agents } from "@/components/Agents";
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
      <Agents />
      <Pricing />
      <Footer />
    </main>
  );
}
