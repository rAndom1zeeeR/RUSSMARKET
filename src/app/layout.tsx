import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import { Providers } from "@/shared/components/providers";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "cyrillic"],
});

export const metadata: Metadata = {
  title: "CRM — График смен",
  description: "Создание рабочего графика сотрудников",
  icons: {
    icon: { url: "/icon.png", sizes: "180x180", type: "image/png" },
    apple: { url: "/apple-icon.png", sizes: "180x180", type: "image/png" },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className={`${manrope.variable} h-full antialiased`}>
      <body className="h-full">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
