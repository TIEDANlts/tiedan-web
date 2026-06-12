import type { Metadata } from "next";
import { Fraunces, Inter, Nunito, Space_Grotesk } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const inter = Inter({
  variable: "--font-ui",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-public-serif",
  subsets: ["latin"],
});

const nunito = Nunito({
  variable: "--font-private-rounded",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-number",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "铁蛋的个人网站",
  description: "个人生活管理网站",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      suppressHydrationWarning
      className={`${inter.variable} ${fraunces.variable} ${nunito.variable} ${spaceGrotesk.variable} h-full antialiased`}
    >
      <body className="theme-public min-h-full bg-bg text-ink">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
