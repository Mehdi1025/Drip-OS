import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { MainScrollShell } from "@/components/MainScrollShell";
import { MobileTabBar } from "@/components/MobileTabBar";
import { MobileTopBar } from "@/components/MobileTopBar";
import { PwaInstallBanner } from "@/components/PwaInstallBanner";
import { Sidebar } from "@/components/Sidebar";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Drip OS",
  description: "Gestion de production e-commerce",
  applicationName: "Drip OS",
  appleWebApp: {
    capable: true,
    title: "Drip OS",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ccff00" },
    { media: "(prefers-color-scheme: dark)", color: "#ccff00" },
  ],
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
            <MainScrollShell>{children}</MainScrollShell>
          </div>
        </div>
        <MobileTabBar />
        <PwaInstallBanner />
      </body>
    </html>
  );
}
