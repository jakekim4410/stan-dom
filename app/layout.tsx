import type { Metadata } from "next";
import { Chakra_Petch, Noto_Sans_KR } from "next/font/google";
import BackgroundEffects from "@/components/BackgroundEffects";
import "./globals.css";

const chakra = Chakra_Petch({
  weight: ['400', '600', '700'],
  subsets: ["latin"],
  variable: "--font-chakra",
});

const notoSans = Noto_Sans_KR({
  weight: ['400', '700', '900'],
  subsets: ["latin"],
  variable: "--font-noto",
});

export const metadata: Metadata = {
  metadataBase: new URL('http://localhost:3000'), // Change to actual production domain later
  title: "STAN.DOM | Global Artist Fandom Grid",
  description: "The cinematic Cyberpunk dashboard for global K-POP fandom. Nominate, scan, and vote for your favorite artists on the global grid.",
  openGraph: {
    title: "STAN.DOM | Global Artist Fandom Grid",
    description: "Experience the next-gen cinematic leaderboard for global music fandom.",
    images: ["/og-image.png"], 
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "STAN.DOM | Global Artist Fandom Grid",
    description: "Experience the next-gen cinematic leaderboard for global music fandom.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${chakra.variable} ${notoSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans bg-black text-white selection:bg-[#37C561]/30 overflow-x-hidden">
        <BackgroundEffects />
        {children}
      </body>
    </html>
  );
}
