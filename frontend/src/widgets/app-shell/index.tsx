"use client";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  Route,
  Code2,
  FolderCode,
  Award,
  UserRound,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  ArrowUpRight,
} from "lucide-react";
import { useAuth } from "@/features/auth";
import { ThemeToggle } from "@/features/change-theme";
import { Loading } from "@/shared/ui";
import { errorMessage } from "@/shared/api";

const items = [
  { href: "/dashboard", title: "Мой прогресс", icon: LayoutDashboard },
  { href: "/curriculum", title: "Программа курса", icon: Route },
  { href: "/practice", title: "Практика", icon: Code2 },
  { href: "/projects", title: "Проекты", icon: FolderCode },
  { href: "/achievements", title: "Достижения", icon: Award },
  { href: "/profile", title: "Профиль", icon: UserRound },
];
export function AppShell({
  children,
  protectedPage = true,
}: {
  children: ReactNode;
  protectedPage?: boolean;
}) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (protectedPage && !loading && !user) router.replace("/login");
  }, [protectedPage, loading, user, router]);
  if (protectedPage && (loading || !user))
    return <Loading text="Открываем вашу лабораторию…" />;
  return (
    <div className="app-shell">
      <aside className={`app-sidebar ${open ? "open" : ""}`}>
        <Link className="sidebar-brand" href="/">
          <span className="brand-icon">
            <Code2 size={23} />
          </span>
          python<span>/lab</span>
        </Link>
        <div className="sidebar-caption">ВАША ЛАБОРАТОРИЯ</div>
        <nav aria-label="Навигация кабинета">
          {items.map(({ href, title, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={
                path === href ||
                (href === "/curriculum" && path.startsWith("/learn"))
                  ? "selected"
                  : ""
              }
              onClick={() => setOpen(false)}
            >
              <Icon size={18} />
              {title}
              {path === href && <span className="nav-dot" />}
            </Link>
          ))}
        </nav>
        <div className="sidebar-course">
          <small>ВАШ СЛЕДУЮЩИЙ ШАГ</small>
          <h3>
            Одна тема.
            <br />
            Каждый день.
          </h3>
          <p>Маленькие шаги превращаются в большие проекты.</p>
          <Link href={user ? "/practice" : "/register"}>
            Начать практику <ArrowUpRight size={15} />
          </Link>
        </div>
        <div className="sidebar-bottom">
          {user ? (
            <>
              <div className="user-chip">
                <span>{user.username.slice(0, 2).toUpperCase()}</span>
                <div>
                  <strong>{user.username}</strong>
                  <small>Python Explorer</small>
                </div>
              </div>
              <button
                onClick={async () => {
                  try {
                    await logout();
                    router.push("/login");
                  } catch (error) {
                    setError(errorMessage(error));
                  }
                }}
              >
                <LogOut size={17} />
                Выйти
              </button>
              {error && <small role="alert">{error}</small>}
            </>
          ) : (
            <Link href="/register" className="button">
              Создать аккаунт
            </Link>
          )}
        </div>
      </aside>
      <div className="app-body">
        <header className="app-topbar">
          <button
            className="icon-button sidebar-toggle"
            aria-label="Навигация курса"
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            {open ? <PanelLeftClose size={20} /> : <PanelLeftOpen size={20} />}
          </button>
          <span className="breadcrumb">
            ЛАБОРАТОРИЯ <span>/</span>{" "}
            {items.find((i) => i.href === path)?.title ?? "Обучение"}
          </span>
          <div>
            <span className="system-status">
              <i />
              Система готова
            </span>
            <ThemeToggle />
          </div>
        </header>
        <main id="main" className="app-content">
          {children}
        </main>
      </div>
    </div>
  );
}
