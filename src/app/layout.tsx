import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Inter } from "next/font/google";
import Navbar from "@/components/Navbar";
import AuthSessionProvider from "@/components/providers/SessionProvider";
import RouteProgressBar from "@/components/providers/RouteProgressBar";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "NTG Lounge — Namma Tulunad Gaming",
  description:
    "Mangaluru's premier esports lounge. Ryzen 5 7600X · RTX 5060 · 300Hz. Home to VAL CUP, CS CUP and AUC CUP tournaments.",
  icons: {
    icon: [{ url: "/ntg-logo.png", type: "image/png" }],
    apple: "/ntg-logo.png",
    shortcut: "/ntg-logo.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#070b14",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${inter.variable} antialiased`}
    >
      <body>
        <AuthSessionProvider>
          <RouteProgressBar />
          <Navbar />
          {children}
        </AuthSessionProvider>
      </body>
    </html>
  );
}
