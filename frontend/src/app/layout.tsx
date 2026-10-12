import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";
const geist = Geist({ subsets: ["latin", "cyrillic"], variable: "--font-sans" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" });
export const metadata: Metadata = { title: { default: "Python Lab — от первой строки до production", template: "%s · Python Lab" }, description: "Изучайте Python через теорию, интерактивные задачи и проекты. 12 уровней от первой программы до профессиональной разработки." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="ru" suppressHydrationWarning><body className={`${geist.variable} ${mono.variable}`}><a href="#main" className="skip-link">Перейти к содержимому</a><Providers>{children}</Providers></body></html>; }
