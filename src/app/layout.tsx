import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Montserrat, Open_Sans, Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import ToastContainer from "@/components/ToastContainer";
import { AuthProvider } from "@/components/AuthProvider";

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

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const openSans = Open_Sans({
  variable: "--font-open-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
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
  themeColor: "#0077B6",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${montserrat.variable} ${openSans.variable} ${inter.variable} ${spaceGrotesk.variable} h-full antialiased dark`}
    >
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
        <script dangerouslySetInnerHTML={{ __html: `
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then(function(registrations) {
              for (let registration of registrations) {
                registration.unregister();
              }
            });
            caches.keys().then(function(names) {
              for (let name of names) caches.delete(name);
            });
          }
        ` }} />
      </head>
      <body className="h-screen bg-[#10141a] text-[#dfe2eb] overflow-hidden relative">
        <AuthProvider>
          <ToastContainer />
          {/* Child layouts like (main)/layout and /investor control the actual flex flows */}
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
