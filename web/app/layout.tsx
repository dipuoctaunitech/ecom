import type { Metadata } from "next";
import { Manrope, Outfit } from "next/font/google";
import { getServerSession } from "next-auth";
import AuthProvider from "@/components/providers/AuthProvider";
import ThemeProvider from "@/components/providers/ThemeProvider";
import { authOptions } from "@/lib/auth";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

export const metadata: Metadata = {
  title: "FORMA — Curated Everyday Objects",
  description:
    "A refined collection of lighting, kitchenware, and home essentials.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="en" className={`${outfit.variable} ${manrope.variable}`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("theme");if(t==="dark"||(t!=="light"&&matchMedia("(prefers-color-scheme:dark)").matches))document.documentElement.classList.add("dark")}catch(e){}})()`,
          }}
        />
      </head>
      <body className="min-h-screen font-body antialiased">
        <ThemeProvider>
          <AuthProvider session={session}>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
