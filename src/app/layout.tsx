import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ToastContainer from "@/components/ToastContainer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Maji Safi OS",
  description: "Hydrate. Elevate.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "MajiOS",
  },
};

export const viewport: Viewport = {
  themeColor: "#021024",
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
