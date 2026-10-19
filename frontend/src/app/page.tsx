import { getLanguage, localizeMetadata } from "@/shared/i18n/server";
import { LandingPage } from "@/views/landing";
import { publicMetadata, SITE_DESCRIPTION, SITE_URL } from "@/shared/config";
export const generateMetadata = () =>
  localizeMetadata(
    publicMetadata("Бесплатный курс Python с практикой", SITE_DESCRIPTION, "/"),
  );
export default async function Page() {
  const { locale, t } = await getLanguage();
  const data = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        name: "Python Lab",
        url: SITE_URL,
        inLanguage: locale,
      },
      {
        "@type": "Course",
        name: t("Бесплатный курс Python"),
        description: t(SITE_DESCRIPTION),
        url: SITE_URL,
        inLanguage: locale,
        isAccessibleForFree: true,
        provider: {
          "@type": "Person",
          name: "Максим Викторович",
          url: "https://itmyportfolio.site",
        },
      },
    ],
  };
  return (
    <>
      <script type="application/ld+json">
        {JSON.stringify(data).replace(/</g, "\\u003c")}
      </script>
      <LandingPage />
    </>
  );
}
