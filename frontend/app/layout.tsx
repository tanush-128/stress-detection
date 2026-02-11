import type { Metadata } from "next";
import { Quicksand, Comfortaa } from "next/font/google";
import "./globals.css";

const quicksand = Quicksand({
  variable: "--font-quicksand",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const comfortaa = Comfortaa({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Mindful - Stress Analysis",
  description: "Your peaceful space for understanding stress",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${quicksand.variable} ${comfortaa.variable} antialiased`}
        style={{ fontFamily: "var(--font-quicksand), system-ui, sans-serif" }}
      >
        {children}
      </body>
    </html>
  );
}
