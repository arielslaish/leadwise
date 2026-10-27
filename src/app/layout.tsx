import type { Metadata } from "next";
import { Doto, Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const doto = Doto({ variable: "--font-doto", subsets: ["latin"], weight: ["500", "700"] });

export const metadata: Metadata = {
  title: "Leadwise: who to call first",
  description:
    "Upload a lead list. Leadwise cleans it, scores every row with Claude against a transparent ICP rubric, and routes it like a Salesforce Flow.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${doto.variable} antialiased`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
