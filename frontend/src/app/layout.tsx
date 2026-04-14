import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "PaviFlexFlooring — Visualiza tu suelo",
  description: "Previsualiza diferentes tipos de pavimento en tu espacio usando IA",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={`${inter.variable} font-sans bg-gray-950 text-white antialiased`}>
        {children}
      </body>
    </html>
  );
}
