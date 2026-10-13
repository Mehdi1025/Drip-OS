import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Sidebar } from "@/components/Sidebar";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Drip OS",
  description: "Gestion de production e-commerce",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className={inter.className}>
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="min-h-screen min-w-0 flex-1 overflow-auto bg-drip-paper">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
