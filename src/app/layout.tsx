import type { Metadata } from "next";
import { Playfair_Display, Space_Mono } from "next/font/google";
import "./globals.css";

const playfair = Playfair_Display({
  variable: "--font-serif",
  subsets: ["latin"],
});

const spaceMono = Space_Mono({
  variable: "--font-mono",
  weight: ["400"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Eunoia",
  description: "See your beautiful thinking",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${playfair.variable} ${spaceMono.variable} antialiased`}
        style={{ fontFamily: "var(--font-serif), serif" }}
      >
        {children}
      </body>
    </html>
  );
}
