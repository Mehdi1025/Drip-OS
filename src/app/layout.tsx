import type { Metadata, Viewport } from "next";
import { Onest, Syne } from "next/font/google";
import { MainScrollShell } from "@/components/MainScrollShell";
import { MobileTabBar } from "@/components/MobileTabBar";
import { MobileTopBar } from "@/components/MobileTopBar";
import { PwaInstallBanner } from "@/components/PwaInstallBanner";
import { Sidebar } from "@/components/Sidebar";
import "./globals.css";

const onest = Onest({
  subsets: ["latin"],
  variable: "--font-onest",
  display: "swap",
});

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-syne",
  display: "swap",
});

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
      { url: "/branding/app-icon.png", sizes: "512x512", type: "image/png" },
      { url: "/favicon.ico", sizes: "32x32" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
    shortcut: ["/favicon.ico"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#F7F5F2",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${onest.variable} ${syne.variable}`}>
      <body className="overflow-x-hidden font-sans">
        <div className="relative z-[1] flex min-h-[100dvh]">
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
