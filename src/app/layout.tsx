import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import { Suspense } from "react";
import { Navbar } from "@/components/navbar";
import { TRPCReactProvider } from "@/trpc/client";
import "./globals.css";

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DevRoast",
  description: "Paste your code. Get roasted.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={jetbrainsMono.variable}>
      <body className="font-sans antialiased">
        <Suspense>
          <TRPCReactProvider>
            <Navbar />
            {children}
          </TRPCReactProvider>
        </Suspense>
      </body>
    </html>
  );
}
