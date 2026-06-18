import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Inter } from "next/font/google";
import Navbar from "@/components/Navbar";
import AuthSessionProvider from "@/components/providers/SessionProvider";
import RouteProgressBar from "@/components/providers/RouteProgressBar";
import { getSession } from "@core/auth/session";
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

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  process.env.AUTH_URL ??
  "https://www.ntgesports.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "NTG Lounge | Namma Tulunad Gaming",
    template: "%s | NTG Lounge",
  },
  description:
    "Mangaluru's premier esports lounge. Ryzen 5 7600X · RTX 5060 · 300Hz. Home to VAL CUP, CS CUP and AUC CUP tournaments.",
  icons: {
    icon: [
      { url: "/favicon.png", type: "image/png" },
      { url: "/ntg-logo.png", type: "image/png" },
    ],
    apple: [{ url: "/ntg-logo.png", type: "image/png" }],
    shortcut: "/favicon.png",
  },
  openGraph: {
    type: "website",
    siteName: "NTG Lounge",
    title: "NTG Lounge | Namma Tulunad Gaming",
    description:
      "Mangaluru's premier esports lounge. Tournaments, rankings, and membership.",
    images: [{ url: "/ntg-logo.png", width: 512, height: 512, alt: "NTG Lounge logo" }],
  },
  twitter: {
    card: "summary",
    images: ["/ntg-logo.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#070b14",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();

  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${inter.variable} antialiased`}
    >
      <body>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[10001] focus:rounded-lg focus:bg-black focus:px-4 focus:py-2 focus:text-sm focus:text-white focus:outline focus:outline-2 focus:outline-[var(--color-brand)]"
        >
          Skip to content
        </a>
        <AuthSessionProvider session={session}>
          <RouteProgressBar />
          <Navbar />
          {children}
        </AuthSessionProvider>
      </body>
    </html>
  );
}
