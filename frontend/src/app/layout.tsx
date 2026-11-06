import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "کانبان کدکس — برد پروژه",
  description: "بردی ساده و متمرکز برای مدیریت کارها.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fa" dir="rtl" data-theme="dark">
      <body>{children}</body>
    </html>
  );
}
