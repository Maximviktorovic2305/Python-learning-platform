"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X, ArrowUpRight, Terminal } from "lucide-react";
import { ThemeToggle } from "@/features/change-theme";
import { useAuth } from "@/features/auth";

export function Brand() {
  return (
    <Link href="/" className="brand" aria-label="Python Lab — главная">
      <span className="brand-icon">
        <Terminal size={21} />
      </span>
      <span>
        python<span className="brand-light">/lab</span>
        <small>ZERO → PROFESSIONAL</small>
      </span>
    </Link>
  );
}
export function Header() {
  const path = usePathname();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  return (
    <header className="site-header">
      <div className="header-inner">
        <Brand />
        <nav
          className={`top-nav ${open ? "is-open" : ""}`}
          aria-label="Главная навигация"
        >
          <Link
            href="/curriculum"
            className={path === "/curriculum" ? "active" : ""}
            onClick={() => setOpen(false)}
          >
            Программа
          </Link>
          <Link href="/projects" onClick={() => setOpen(false)}>
            Проекты
          </Link>
          <Link href="/#method" onClick={() => setOpen(false)}>
            Как это работает
          </Link>
        </nav>
        <div className="header-actions">
          <ThemeToggle />
          <Link href={user ? "/dashboard" : "/login"} className="header-login">
            {user ? "Мой кабинет" : "Войти"}
          </Link>
          <Link
            href={user ? "/dashboard" : "/register"}
            className="button compact"
          >
            {user ? "Продолжить" : "Начать учиться"}
            <ArrowUpRight size={16} />
          </Link>
          <button
            className="icon-button mobile-menu"
            aria-expanded={open}
            aria-label={open ? "Закрыть меню" : "Открыть меню"}
            onClick={() => setOpen(!open)}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>
    </header>
  );
}
