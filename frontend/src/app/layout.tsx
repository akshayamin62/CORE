import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import VisitorTracker from "@/components/VisitorTracker";
import MobileAppProviders from "@/components/MobileAppProviders";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CORE - Powered by ADMITra",
  description: "Connect, Learn, and Grow Together",
  icons: {
    icon: '/logo3.png',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover' as const,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="overflow-x-hidden" suppressHydrationWarning>
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=5, viewport-fit=cover"
        />
        <script src="https://checkout.razorpay.com/v1/checkout.js" async />
      </head>
      <body
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} antialiased flex w-full max-w-full min-w-0 flex-col min-h-screen overflow-x-hidden`}
      >
        <VisitorTracker />
        <MobileAppProviders />
        <Navbar />
        <main className="grow min-w-0 w-full max-w-full overflow-x-hidden pt-[calc(5rem+env(safe-area-inset-top,28px))] md:pt-20">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}

