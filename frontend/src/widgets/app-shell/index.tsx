"use client";
import { useI18n } from "@/shared/i18n";

import type { ReactNode } from "react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
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
import { PrivacyPreferences } from "@/features/privacy-preferences";
import { PythonLogo } from "@/shared/ui/python-logo";
import { PageSkeleton, type PageSkeletonVariant } from "./skeleton";
import { Skeleton, SkeletonRegion } from "@/shared/ui";
export { PageSkeleton, LessonNavigationSkeleton } from "./skeleton";
import { errorMessage } from "@/shared/api";
import { ChangeLanguage } from "@/features/change-language";

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
const desktopSnapshot = () => window.matchMedia("(min-width: 641px)").matches;
const serverDesktopSnapshot = () => true;
const subscribeToViewport = (notify: () => void) => {
  const media = window.matchMedia("(min-width: 641px)");
  media.addEventListener("change", notify);
  return () => media.removeEventListener("change", notify);
};
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
  const { text: localize } = useI18n();

  const { user, loading, loggingOut, logout, updateUser } = useAuth();
  const router = useRouter();
  const path = usePathname();
  const protectedPage = [
    "/dashboard",
    "/practice",
    "/achievements",
    "/profile",
  ].includes(path);
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const desktop = useSyncExternalStore(
    subscribeToViewport,
    desktopSnapshot,
    serverDesktopSnapshot,
  );
  const sidebarVisible = desktop ? !collapsed : open;
  const toggle = useRef<HTMLButtonElement>(null);
  const hideSidebar = () => {
    if (desktop) setCollapsed(true);
    else setOpen(false);
    toggle.current?.focus();
  };
  const [error, setError] = useState("");
  useEffect(() => {
    if (protectedPage && !loading && !loggingOut && !user)
      router.replace("/login");
  }, [protectedPage, loading, loggingOut, user, router]);
  return (
    <div className={`app-shell ${collapsed ? "sidebar-collapsed" : ""}`}>
      <aside
        id="main-sidebar"
        inert={!sidebarVisible}
        className={`app-sidebar ${open ? "open" : ""}`}
        onKeyDown={(event) => {
          if (event.key === "Escape") hideSidebar();
        }}
      >
        <Link className="sidebar-brand" href="/">
          <span className="brand-icon">
            <PythonLogo size={23} />
          </span>
          python<span>/lab</span>
        </Link>
        <div className="sidebar-caption">{localize("ВАША ЛАБОРАТОРИЯ")}</div>
        <nav aria-label={localize("Навигация кабинета")}>
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
              {localize(title)}
              {path === href && <span className="nav-dot" />}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          {loading ? (
            <SkeletonRegion label={localize("Восстанавливаем сессию…")}>
              <div className="skeleton-row">
                <Skeleton width={36} height={36} circle />
                <Skeleton width={110} height={14} />
              </div>
            </SkeletonRegion>
          ) : user ? (
            <>
              <div className="user-chip ym-hide-content">
                <span>{localize(user.username.slice(0, 2).toUpperCase())}</span>
                <div>
                  <strong>{localize(user.username)}</strong>
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
                {localize(" Выйти ")}
              </button>
              {error && <small role="alert">{localize(error)}</small>}
            </>
          ) : (
            <Link href="/register" className="button">
              {localize(" Создать аккаунт ")}
            </Link>
          )}
        </div>
      </aside>
      {!desktop && open && (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label={localize("Закрыть навигацию")}
          onClick={hideSidebar}
        />
      )}
      <div className="app-body">
        <header className="app-topbar">
          <button
            className="icon-button sidebar-toggle"
            ref={toggle}
            type="button"
            aria-label={localize(
              sidebarVisible
                ? "Скрыть боковую панель"
                : "Открыть боковую панель",
            )}
            aria-controls="main-sidebar"
            aria-expanded={sidebarVisible}
            onClick={() =>
              desktop ? setCollapsed(!collapsed) : setOpen(!open)
            }
          >
            {sidebarVisible ? (
              <PanelLeftClose size={20} />
            ) : (
              <PanelLeftOpen size={20} />
            )}
          </button>
          <span className="breadcrumb">
            {localize(" ЛАБОРАТОРИЯ ")}
            <span>/</span>{" "}
            {localize(items.find((i) => i.href === path)?.title ?? "Обучение")}
          </span>
          <div>
            <span className="system-status">
              <i />
              {localize(" Система готова ")}
            </span>
            <ChangeLanguage
              user={user}
              onSaved={updateUser}
              disabled={loading || loggingOut}
            />
            <ThemeToggle />
          </div>
        </header>
        <PrivacyPreferences inline />
        <main id="main" className="app-content">
          {localize(
            protectedPage && (loading || !user) ? (
              <PageSkeleton variant={skeletonVariant(path)} heading />
            ) : (
              children
            ),
          )}
        </main>
      </div>
    </div>
  );
}
