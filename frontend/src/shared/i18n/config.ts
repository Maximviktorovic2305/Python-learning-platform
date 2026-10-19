export const languages = [
  { code: "ru", name: "Русский" },
  { code: "en", name: "English" },
  { code: "zh-CN", name: "简体中文" },
  { code: "es", name: "Español" },
  { code: "pt-BR", name: "Português (Brasil)" },
  { code: "fr", name: "Français" },
  { code: "de", name: "Deutsch" },
  { code: "ja", name: "日本語" },
  { code: "hi", name: "हिन्दी" },
  { code: "ar", name: "العربية" },
] as const;

export type Locale = (typeof languages)[number]["code"];
export const LOCALE_COOKIE = "python-lab-locale";
export const isLocale = (value: unknown): value is Locale =>
  languages.some((language) => language.code === value);
export const direction = (locale: Locale) => (locale === "ar" ? "rtl" : "ltr");

export const openGraphLocales: Record<Locale, string> = {
  ru: "ru_RU",
  en: "en_US",
  "zh-CN": "zh_CN",
  es: "es_ES",
  "pt-BR": "pt_BR",
  fr: "fr_FR",
  de: "de_DE",
  ja: "ja_JP",
  hi: "hi_IN",
  ar: "ar_SA",
};
