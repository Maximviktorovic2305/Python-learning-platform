"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  direction,
  isLocale,
  languages,
  LOCALE_COOKIE,
  type Locale,
} from "./config";
import { loadDictionary } from "./dictionaries";
import { createTranslator, type Dictionary } from "./translate";
import { useRouter } from "next/navigation";

export { languages, isLocale, type Locale } from "./config";

type I18n = {
  locale: Locale;
  setLocale: (locale: Locale) => Promise<void>;
  t: (text: string) => string;
  text: <T>(value: T) => T;
};
const Context = createContext<I18n | null>(null);

export function LanguageProvider({
  initialLocale,
  dictionary,
  children,
}: {
  initialLocale: Locale;
  dictionary: Dictionary;
  children: ReactNode;
}) {
  const [state, setState] = useState({ locale: initialLocale, dictionary });
  const request = useRef(0);
  const currentLocale = useRef(initialLocale);
  const router = useRouter();
  const channel = useRef<BroadcastChannel | null>(null);
  const setLocale = useCallback(
    async (locale: Locale, broadcast = true) => {
      if (!isLocale(locale)) return;
      const version = ++request.current;
      if (locale === currentLocale.current) return;
      const dictionary = await loadDictionary(locale);
      if (request.current !== version) return;
      setState({ locale, dictionary });
      currentLocale.current = locale;
      let persisted = false;
      try {
        document.cookie = `${LOCALE_COOKIE}=${locale}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
        persisted = document.cookie
          .split("; ")
          .some((cookie) => cookie === `${LOCALE_COOKIE}=${locale}`);
      } catch {
        /* The current page still works when cookies are disabled. */
      }
      if (broadcast) channel.current?.postMessage(locale);
      if (persisted) router.refresh();
    },
    [router],
  );
  useEffect(() => {
    document.documentElement.lang = state.locale;
    document.documentElement.dir = direction(state.locale);
  }, [state.locale]);
  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const connection = new BroadcastChannel("python-lab-language");
    channel.current = connection;
    connection.onmessage = (event: MessageEvent<unknown>) => {
      if (isLocale(event.data))
        void setLocale(event.data, false).catch(() => {});
    };
    return () => {
      channel.current = null;
      connection.close();
    };
  }, [setLocale]);
  const value = useMemo(() => {
    const t = createTranslator(state.dictionary);
    // React elements, code props and application data remain untouched.
    const text = <T,>(value: T): T =>
      typeof value === "string" ? (t(value) as T) : value;
    return { locale: state.locale, setLocale, t, text };
  }, [state, setLocale]);
  return <Context value={value}>{children}</Context>;
}

export function useI18n() {
  const context = useContext(Context);
  if (!context) throw new Error("LanguageProvider required");
  return context;
}

export function SkipLink() {
  const { t } = useI18n();
  return (
    <a href="#main" className="skip-link">
      {t("Перейти к содержимому")}
    </a>
  );
}

/** Accessible native select shared by the header and account settings. */
export function LanguageSelect({
  locale,
  onChange,
  disabled = false,
  id,
}: {
  locale: Locale;
  onChange: (locale: Locale) => void;
  disabled?: boolean;
  id?: string;
}) {
  const { t } = useI18n();
  return (
    <select
      id={id}
      className="language-select"
      aria-label={t("Язык сайта")}
      value={locale}
      disabled={disabled}
      onChange={(event) => {
        if (isLocale(event.target.value)) onChange(event.target.value);
      }}
    >
      {languages.map(({ code, name }) => (
        <option value={code} lang={code} dir="auto" key={code}>
          {name}
        </option>
      ))}
    </select>
  );
}
