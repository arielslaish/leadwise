import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const bricolage = Bricolage_Grotesque({ variable: "--font-bricolage", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Leadwise: who to call first",
  description:
    "Upload a lead list. Leadwise cleans it, scores every row with Claude against a transparent ICP rubric, and routes it like a Salesforce Flow.",
};

export const viewport: Viewport = { themeColor: "#0d0a1c" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${bricolage.variable} antialiased`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
