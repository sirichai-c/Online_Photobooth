import type { Metadata } from "next";
import { LanguageProvider } from "@/components/LanguageProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "LDR Photobooth",
  description: "A free long distance photobooth for two people.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body><LanguageProvider>{children}</LanguageProvider></body>
    </html>
  );
}
