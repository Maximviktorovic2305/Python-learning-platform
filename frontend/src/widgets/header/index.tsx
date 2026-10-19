"use client";
import { useI18n } from "@/shared/i18n";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X, ArrowUpRight } from "lucide-react";
import { PythonLogo } from "@/shared/ui/python-logo";
import { ThemeToggle } from "@/features/change-theme";
import { useAuth } from "@/features/auth";
import { Skeleton } from "@/shared/ui";
import { ChangeLanguage } from "@/features/change-language";

export function Brand() {
  const { text: localize } = useI18n();

  return (
    <Link
      href="/"
      className="brand"
      aria-label={localize("Python Lab — главная")}
    >
      <span className="brand-icon">
        <PythonLogo size={28} />
      </span>
      <span>
        python<span className="brand-light">/lab</span>
        <small>{localize("С нуля, без опыта")}</small>
      </span>
    </Link>
  );
}
export function Header() {
  const { text: localize } = useI18n();

  const path = usePathname();
  const { user, loading, updateUser } = useAuth();
  const [open, setOpen] = useState(false);
  return (
    <header className="site-header">
      <div className="header-inner">
        <Brand />
        <nav
          className={`top-nav ${open ? "is-open" : ""}`}
          aria-label={localize("Главная навигация")}
        >
          <Link
            href="/curriculum"
            className={path === "/curriculum" ? "active" : ""}
            onClick={() => setOpen(false)}
          >
            {localize(" Программа ")}
          </Link>
          <Link href="/projects" onClick={() => setOpen(false)}>
            {localize(" Проекты ")}
          </Link>
        </nav>
        <div className="header-actions">
          <ChangeLanguage user={user} onSaved={updateUser} disabled={loading} />
          <ThemeToggle />
          {loading ? (
            <Skeleton width={70} height={16} className="header-login" />
          ) : (
            <Link
              href={user ? "/dashboard" : "/login"}
              className="header-login"
            >
              {localize(user ? "Мой кабинет" : "Войти")}
            </Link>
          )}
          {loading ? (
            <Skeleton width={145} height={37} />
          ) : (
            <Link
              href={user ? "/dashboard" : "/register"}
              className="button compact"
            >
              {localize(user ? "Продолжить" : "Начать учиться")}
              <ArrowUpRight size={16} />
            </Link>
          )}
          <button
            className="icon-button mobile-menu"
            aria-expanded={open}
            aria-label={localize(open ? "Закрыть меню" : "Открыть меню")}
            onClick={() => setOpen(!open)}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>
    </header>
  );
}
