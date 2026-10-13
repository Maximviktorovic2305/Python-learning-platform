import { LandingPage } from "@/views/landing";
import { publicMetadata, SITE_DESCRIPTION, SITE_URL } from "@/shared/config";
export const metadata = publicMetadata(
  "Бесплатный курс Python с практикой",
  SITE_DESCRIPTION,
  "/",
);
export default function Page() {
  const data = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        name: "Python Lab",
        url: SITE_URL,
        inLanguage: "ru-RU",
      },
      {
        "@type": "Course",
        name: "Бесплатный курс Python",
        description: SITE_DESCRIPTION,
        url: SITE_URL,
        inLanguage: "ru-RU",
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
