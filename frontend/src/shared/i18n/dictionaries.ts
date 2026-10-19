import type { Locale } from "./config";
import type { Dictionary } from "./translate";

const loaders = {
  en: () => import("./messages/en.json"),
  "zh-CN": () => import("./messages/zh-CN.json"),
  es: () => import("./messages/es.json"),
  "pt-BR": () => import("./messages/pt-BR.json"),
  fr: () => import("./messages/fr.json"),
  de: () => import("./messages/de.json"),
  ja: () => import("./messages/ja.json"),
  hi: () => import("./messages/hi.json"),
  ar: () => import("./messages/ar.json"),
};

export async function loadDictionary(locale: Locale): Promise<Dictionary> {
  return locale === "ru" ? {} : (await loaders[locale]()).default;
}
