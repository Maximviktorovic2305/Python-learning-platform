"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
  type FormEvent,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { User } from "@/entities/user";
import {
  api,
  unwrap,
  setAccessToken,
  refreshSession,
  errorMessage,
  type Schema,
} from "@/shared/api";
import { Button } from "@/shared/ui";
type AuthState = {
  user: User | null;
  loading: boolean;
  accept: (data: Schema<"AuthView">) => void;
  updateUser: (user: User) => void;
  logout: () => Promise<void>;
};
const AuthContext = createContext<AuthState | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();
  useEffect(() => {
    let live = true;
    refreshSession()
      .then((data) => {
        if (live && data) setUser(data.user);
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, []);
  const accept = (data: Schema<"AuthView">) => {
    queryClient.clear();
    setAccessToken(data.access_token);
    setUser(data.user);
  };
  const logout = async () => {
    unwrap(await api.POST("/api/auth/logout"));
    setAccessToken(null);
    setUser(null);
    queryClient.clear();
  };
  return (
    <AuthContext value={{ user, loading, accept, updateUser: setUser, logout }}>
      {children}
    </AuthContext>
  );
}
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("AuthProvider required");
  return value;
}
export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const { accept } = useAuth();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setPending(true);
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email"));
    const password = String(form.get("password"));
    try {
      const data =
        mode === "register"
          ? unwrap(
              await api.POST("/api/auth/register", {
                body: {
                  email,
                  password,
                  username: String(form.get("username")),
                },
              }),
            )
          : unwrap(
              await api.POST("/api/auth/login", { body: { email, password } }),
            );
      accept(data);
      router.push("/dashboard");
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setPending(false);
    }
  };
  return (
    <form className="auth-form" onSubmit={submit}>
      {mode === "register" && (
        <label>
          Имя пользователя
          <input
            name="username"
            minLength={3}
            maxLength={40}
            pattern="[a-zA-Z0-9_]+"
            required
            autoComplete="username"
            placeholder="python_explorer"
          />
          <small>Латинские буквы, цифры и подчёркивание.</small>
        </label>
      )}
      <label>
        Email
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
        />
      </label>
      <label>
        Пароль
        <input
          name="password"
          type="password"
          minLength={mode === "register" ? 12 : 1}
          maxLength={128}
          required
          autoComplete={
            mode === "register" ? "new-password" : "current-password"
          }
          placeholder={
            mode === "register" ? "Не менее 12 символов" : "Ваш пароль"
          }
        />
      </label>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <Button disabled={pending}>
        {pending
          ? "Подождите…"
          : mode === "register"
            ? "Создать аккаунт"
            : "Войти в лабораторию"}
      </Button>
      <p className="form-foot">
        {mode === "register" ? "Уже учитесь с нами?" : "Пока нет аккаунта?"}{" "}
        <Link href={mode === "register" ? "/login" : "/register"}>
          {mode === "register" ? "Войти" : "Начать обучение"}
        </Link>
      </p>
    </form>
  );
}
