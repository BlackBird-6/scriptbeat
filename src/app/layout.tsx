import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ScriptBeat",
  description: "Visual Narrative Pacing Engine",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-[#0e0e0e] text-[#f2f2f2] antialiased`}>
        {children}
      </body>
    </html>
  );
}
