import type { Metadata } from "next";
import { Instrument_Serif } from "next/font/google";
import { GeistSans } from "geist/font/sans";
import { LenisProvider } from "@/components/ui/LenisProvider";
import { NoiseTexture } from "@/components/ui/NoiseTexture";
import { ScrollRail } from "@/components/ui/ScrollRail";
import "./globals.css";

const serif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-serif",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://unwritten.health"),
  title: {
    default: "Unwritten — the appeal they never expected",
    template: "%s · Unwritten",
  },
  description:
    "Insurance companies deny one in five claims. Sixty percent of appeals win — but almost no one files them. Unwritten does, in three minutes, for free.",
  openGraph: {
    title: "Unwritten",
    description:
      "An AI legal advocate for patients denied by their insurer.",
    type: "website",
  },
  other: {
    "color-scheme": "light",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${serif.variable} ${GeistSans.variable}`}>
      <body className="bg-paper text-ink antialiased">
        <LenisProvider>
          <NoiseTexture />
          <ScrollRail />
          {children}
        </LenisProvider>
      </body>
    </html>
  );
}
