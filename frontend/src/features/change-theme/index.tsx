"use client";
import { useTheme } from "next-themes";
import { SunMoon } from "lucide-react";
export function ThemeToggle() { const { resolvedTheme, setTheme } = useTheme(); return <button className="icon-button" aria-label="Переключить тему" onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}><SunMoon size={19} /></button>; }
