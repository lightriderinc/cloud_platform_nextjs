import Header from "@/components/Header";
import Sidebar from "@/components/sidebar/Sidebar";
import WelcomeModal from "@/components/WelcomeModal";
import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, Science_Gothic } from "next/font/google";
import "./globals.css";
import Providers from "./providers";

const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-ibm-plex-sans",
  subsets: ["latin"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const scienceGothic = Science_Gothic({
  variable: "--font-science-gothic",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Cloud quantum computing",
  description: "Light Rider cloud quantum platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${ibmPlexSans.variable} ${ibmPlexMono.variable} ${scienceGothic.variable} h-full antialiased`}
    >
      <body className="h-full flex flex-col overflow-hidden">
        <Providers>
          <WelcomeModal />
          <Header />
          <div className="flex flex-1 min-h-0">
            <Sidebar />
            <main className="flex-1 overflow-y-auto px-4 py-6 lg:px-8">{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
