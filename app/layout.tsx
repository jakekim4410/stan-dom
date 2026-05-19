import type { Metadata } from "next";
import { Chakra_Petch, Noto_Sans_KR } from "next/font/google";
import BackgroundEffects from "@/components/BackgroundEffects";
import Script from "next/script";
import "./globals.css";

const chakra = Chakra_Petch({
  weight: ['400', '600', '700'],
  // 🔴 "latin-ext"를 추가했습니다.
  subsets: ["latin", "latin-ext"],
  variable: "--font-chakra",
});

// 12번째 줄 근처 notoSans 설정 수정
const notoSans = Noto_Sans_KR({
  weight: ['400', '700', '900'],
  // 🔴 여기도 "latin-ext"를 추가해주는 것이 안전합니다.
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

import { MusicProvider } from "@/app/contexts/MusicContext";
import MusicPlayer from "@/components/MusicPlayer";
import WebViewStateSync from "@/components/WebViewStateSync";

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
      <head>
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7904032658716092"
          crossOrigin="anonymous"
        ></script>
      </head>
      <body className="min-h-[100dvh] flex flex-col font-sans bg-black text-white selection:bg-[#37C561]/30 overflow-x-hidden antialiased">
        <BackgroundEffects />
        <MusicProvider>
          {children}
          <MusicPlayer />
          <WebViewStateSync />
        </MusicProvider>
      </body>
    </html>
  );
}