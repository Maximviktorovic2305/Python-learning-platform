import { AuthorSupportButton } from "@/features/author-support";
import { PrivacyPreferences } from "@/features/privacy-preferences";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";
import { SITE_URL, SITE_DESCRIPTION, publicMetadata } from "@/shared/config";
const geist = Geist({
  subsets: ["latin", "cyrillic"],
  variable: "--font-sans",
});
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" });
export const metadata: Metadata = {
  ...publicMetadata("Бесплатный курс Python", SITE_DESCRIPTION, "/"),
  alternates: undefined,
  metadataBase: new URL(SITE_URL),
  applicationName: "Python Lab",
  title: {
    default: "Python Lab — бесплатный курс Python с практикой",
    template: "%s · Python Lab",
  },
  description: SITE_DESCRIPTION,
  robots: {
    index: true,
    follow: true,
    googleBot: { "max-image-preview": "large", "max-snippet": -1 },
  },
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="ru"
      data-theme="light"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      {/* Browser extensions may add body attributes before React hydrates. */}
      <body
        className={`${geist.variable} ${mono.variable}`}
        suppressHydrationWarning
      >
        <a href="#main" className="skip-link">
          Перейти к содержимому
        </a>
        <Providers>
          {children}
          <AuthorSupportButton />
          <PrivacyPreferences />
        </Providers>
      </body>
    </html>
  );
}
