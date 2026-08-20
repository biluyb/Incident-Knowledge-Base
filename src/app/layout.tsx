import type { Metadata } from "next";
import "./globals.css";
import { Navigation } from "@/components/Navigation";

export const metadata: Metadata = {
  title: "Incident Knowledge Base",
  description: "T24/Temenos Incident Search & Troubleshooting System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 antialiased">
        <div className="flex min-h-screen">
          <Navigation />
          <main className="flex-1 ml-0 md:ml-64">
            <div className="p-4 md:p-8 max-w-7xl mx-auto">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
