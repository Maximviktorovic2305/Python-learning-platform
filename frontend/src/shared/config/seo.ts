import type { Metadata } from "next";

export const SITE_URL = "https://python-learning.tech";
export const SITE_DESCRIPTION =
  "Бесплатный курс Python: теория, интерактивные задания, проверка кода, проекты и личный прогресс. Учитесь в своём темпе без дневных ограничений.";
export function publicMetadata(
  title: string,
  description: string,
  path: string,
): Metadata {
  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}${path}` },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}${path}`,
      type: "website",
      siteName: "Python Lab",
      locale: "ru_RU",
      images: [
        {
          url: `${SITE_URL}/social-preview.png`,
          width: 1200,
          height: 630,
          alt: "Python Lab — бесплатный курс Python",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`${SITE_URL}/social-preview.png`],
    },
  };
}
