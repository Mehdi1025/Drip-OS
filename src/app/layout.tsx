import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { MobileTabBar } from "@/components/MobileTabBar";
import { MobileTopBar } from "@/components/MobileTopBar";
import { Sidebar } from "@/components/Sidebar";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Drip OS",
  description: "Gestion de production e-commerce",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#f2ede4",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className={`${inter.className} overflow-x-hidden`}>
        <div className="flex min-h-[100dvh]">
          <Sidebar />
          <div className="flex min-h-[100dvh] min-w-0 flex-1 flex-col">
            <MobileTopBar />
            <main className="drip-main-scroll min-h-0 flex-1 overflow-x-hidden overflow-y-auto bg-drip-paper">
              {children}
            </main>
          </div>
        </div>
        <MobileTabBar />
      </body>
    </html>
  );
}
