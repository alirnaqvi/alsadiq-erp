import type { Metadata, Viewport } from "next";
import { Amiri, Inter } from "next/font/google";
import localFont from "next/font/local";
import { getLocale } from "@/lib/locale";
import { LocaleProvider } from "@/components/LocaleProvider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const amiri = Amiri({
  subsets: ["latin", "arabic"],
  weight: ["400", "700"],
  variable: "--font-amiri",
  display: "swap",
});

const nastaliq = localFont({
  src: "../fonts/JameelNooriNastaleeq.woff2",
  variable: "--font-nastaliq",
  display: "swap",
  weight: "400",
  adjustFontFallback: false,
});

export const metadata: Metadata = {
  title: "Al Sadiq Trust — Collection System",
  description: "Donor collection and receipting for Al Sadiq Trust",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#003416",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();

  return (
    <html lang={locale === "ur" ? "ur" : "en"} dir={locale === "ur" ? "rtl" : "ltr"} suppressHydrationWarning>
      <body className={`${inter.variable} ${amiri.variable} ${nastaliq.variable} font-sans antialiased`}>
        <LocaleProvider locale={locale}>{children}</LocaleProvider>
      </body>
    </html>
  );
}
