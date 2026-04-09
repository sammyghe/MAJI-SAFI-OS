import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ToastContainer from "@/components/ToastContainer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Maji Safi OS",
  description: "Hydrate. Elevate.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#0F172A] to-[#020617] text-white overflow-hidden relative">
        <ToastContainer />
        {/* Child layouts like (main)/layout and /investor control the actual flex flows */}
        {children}
      </body>
    </html>
  );
}
