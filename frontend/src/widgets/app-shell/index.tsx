"use client";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  Route,
  FolderCode,
  Award,
  Layers3,
  FileText,
  UserRound,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Code2,
} from "lucide-react";
import { useAuth } from "@/features/auth";
import { ThemeToggle } from "@/features/change-theme";
import { PythonLogo } from "@/shared/ui/python-logo";
import { PageSkeleton, type PageSkeletonVariant } from "./skeleton";
import { Skeleton, SkeletonRegion } from "@/shared/ui";
export { PageSkeleton, LessonNavigationSkeleton } from "./skeleton";
import { errorMessage } from "@/shared/api";

const items = [
  { href: "/dashboard", title: "Мой прогресс", icon: LayoutDashboard },
  { href: "/curriculum", title: "Программа курса", icon: Route },
  { href: "/practice", title: "Практика", icon: PythonLogo },
  { href: "/tasks", title: "Задачи", icon: Code2 },
  { href: "/projects", title: "Проекты", icon: FolderCode },
  { href: "/achievements", title: "Достижения", icon: Award },
  { href: "/profile", title: "Профиль", icon: UserRound },
  { href: "/stack", title: "Стек", icon: Layers3 },
  { href: "/legal-documents", title: "Правовые документы", icon: FileText },
];
function skeletonVariant(path: string): PageSkeletonVariant {
  if (path.startsWith("/learn/")) return "lesson";
  const variants: Record<string, PageSkeletonVariant> = {
    "/dashboard": "dashboard",
    "/curriculum": "curriculum",
    "/practice": "practice",
    "/tasks": "practice",
    "/projects": "projects",
    "/achievements": "achievements",
    "/profile": "profile",
  };
  return variants[path] ?? "dashboard";
}

export function AppShell({ children }: { children: ReactNode }) {
  const { user, loading, loggingOut, logout } = useAuth();
  const router = useRouter();
  const path = usePathname();
  const protectedPage = [
    "/dashboard",
    "/practice",
    "/achievements",
    "/profile",
  ].includes(path);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (protectedPage && !loading && !loggingOut && !user)
      router.replace("/login");
  }, [protectedPage, loading, loggingOut, user, router]);
  return (
    <div className="app-shell">
      <aside className={`app-sidebar ${open ? "open" : ""}`}>
        <Link className="sidebar-brand" href="/">
          <span className="brand-icon">
            <PythonLogo size={23} />
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
                (href === "/curriculum" && path.startsWith("/learn")) ||
                (href === "/tasks" && path.startsWith("/tasks/"))
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
        <div className="sidebar-bottom">
          {loading ? (
            <SkeletonRegion label="Восстанавливаем сессию…">
              <div className="skeleton-row">
                <Skeleton width={36} height={36} circle />
                <Skeleton width={110} height={14} />
              </div>
            </SkeletonRegion>
          ) : user ? (
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
                  } catch (error) {
                    setError(errorMessage(error));
                  } finally {
                    router.replace("/login");
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
          {protectedPage && (loading || !user) ? (
            <PageSkeleton variant={skeletonVariant(path)} heading />
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}
