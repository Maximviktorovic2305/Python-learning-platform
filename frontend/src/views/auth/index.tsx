"use client";
import { useI18n } from "@/shared/i18n";
import { Header } from "@/widgets/header";
import { PythonMark } from "@/widgets/python-mark";
import { AuthForm } from "@/features/auth";
export function AuthPage({ mode }: { mode: "login" | "register" }) {
  const { text: localize } = useI18n();

  return (
    <>
      <Header />
      <main id="main" className="auth-layout container">
        <div className="auth-aside">
          <div className="eyebrow">{localize("Ваш маршрут")}</div>
          <h1>
            {localize(" Будущее начинается ")}
            <br />
            {localize("с первой строки. ")}
          </h1>
          <p>
            {localize(" Понимание вместо зубрёжки. ")}
            <br />
            {localize(" Практика вместо бесконечных видео. ")}
          </p>
          <PythonMark animated />
        </div>
        <section className="auth-card">
          <span className="eyebrow">PYTHON / LAB</span>
          <h2>
            {localize(
              mode === "register" ? "Начнём знакомство." : "С возвращением.",
            )}
          </h2>
          <p>
            {localize(
              mode === "register"
                ? "Создайте аккаунт — и ваш путь сохранится."
                : "Ваша лаборатория ждёт следующую идею.",
            )}
          </p>
          <AuthForm mode={mode} />
        </section>
      </main>
    </>
  );
}
