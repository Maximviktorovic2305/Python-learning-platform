import { cookies } from "next/headers";
import { isLocale, LOCALE_COOKIE, openGraphLocales } from "./config";
import { loadDictionary } from "./dictionaries";
import { createTranslator } from "./translate";
import { cache } from "react";
import type { Metadata } from "next";

export const getLanguage = cache(async () => {
  const cookie = (await cookies()).get(LOCALE_COOKIE)?.value;
  const locale = isLocale(cookie) ? cookie : "ru";
  const dictionary = await loadDictionary(locale);
  return { locale, dictionary, t: createTranslator(dictionary) };
});

export async function localizeMetadata(metadata: Metadata): Promise<Metadata> {
  const { t, locale } = await getLanguage();
  const image = <T>(value: T): T => {
    if (
      typeof value === "object" &&
      value !== null &&
      "alt" in value &&
      typeof value.alt === "string"
    )
      return { ...value, alt: t(value.alt) };
    return value;
  };
  const title = (value: Metadata["title"]) => {
    if (typeof value === "string") return t(value);
    if (!value) return value;
    return {
      ...value,
      ...("default" in value ? { default: t(value.default) } : {}),
      ...("absolute" in value ? { absolute: t(value.absolute) } : {}),
    };
  };
  return {
    ...metadata,
    title: title(metadata.title),
    description: metadata.description
      ? t(metadata.description)
      : metadata.description,
    ...(metadata.openGraph
      ? {
          openGraph: {
            ...metadata.openGraph,
            title: title(metadata.openGraph.title) ?? undefined,
            description: metadata.openGraph.description
              ? t(metadata.openGraph.description)
              : undefined,
            locale: openGraphLocales[locale],
            images: Array.isArray(metadata.openGraph.images)
              ? metadata.openGraph.images.map(image)
              : image(metadata.openGraph.images),
          },
        }
      : {}),
    ...(metadata.twitter
      ? {
          twitter: {
            ...metadata.twitter,
            title: title(metadata.twitter.title) ?? undefined,
            description: metadata.twitter.description
              ? t(metadata.twitter.description)
              : undefined,
          },
        }
      : {}),
  };
}
