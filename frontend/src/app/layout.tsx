import { AuthorSupportButton } from "@/features/author-support";
import { PrivacyPreferences } from "@/features/privacy-preferences";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";
import { SITE_URL, SITE_DESCRIPTION, publicMetadata } from "@/shared/config";
import { getLanguage, localizeMetadata } from "@/shared/i18n/server";
import { direction } from "@/shared/i18n/config";
import { SkipLink } from "@/shared/i18n";
const geist = Geist({
  subsets: ["latin", "cyrillic"],
  variable: "--font-sans",
});
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" });
export const generateMetadata = () =>
  localizeMetadata({
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
  });
export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { locale, dictionary } = await getLanguage();
  return (
    <html
      lang={locale}
      dir={direction(locale)}
      data-theme="light"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      {/* Browser extensions may add body attributes before React hydrates. */}
      <body
        className={`${geist.variable} ${mono.variable}`}
        suppressHydrationWarning
      >
        <Providers locale={locale} dictionary={dictionary}>
          <SkipLink />
          {children}
          <AuthorSupportButton />
          <PrivacyPreferences />
        </Providers>
      </body>
    </html>
  );
}
