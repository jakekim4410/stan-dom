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
  metadataBase: new URL('https://standom.online'),
  title: "STAN.DOM | Global Artist Fandom Grid",
  description: "The cinematic Cyberpunk dashboard for global K-POP fandom. Nominate, scan, and vote for your favorite artists on the global grid.",
  openGraph: {
    title: "STAN.DOM | Global Artist Fandom Grid",
    description: "Experience the next-gen cinematic leaderboard for global music fandom.",
    // 여기를 .jpeg로 정확하게 수정
    images: ["/og-image.jpeg"],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "STAN.DOM | Global Artist Fandom Grid",
    description: "Experience the next-gen cinematic leaderboard for global music fandom.",
    // 여기도 .jpeg로 수정
    images: ["/og-image.jpeg"],
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
      className={`${chakra.variable} ${notoSans.variable} antialiased`}
    >
      <body className="min-h-[100dvh] flex flex-col font-sans bg-black text-white selection:bg-[#37C561]/30 overflow-x-hidden antialiased">
        <BackgroundEffects />
        {children}
      </body>
    </html>
  );
}