"use client";

import { LEGAL_VERSION } from "@/shared/config";
import { ConsentFields, LegalLinks } from "@/shared/ui/legal";
import {
  createContext,
  useContext,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type ReactNode,
  type FormEvent,
} from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
  useIsMutating,
} from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { userQuery, type User } from "@/entities/user";
import { sessionQuery } from "@/entities/session";
import {
  api,
  unwrap,
  setAccessToken,
  endSession,
  revokeSession,
  subscribeSessionEnd,
  type Schema,
} from "@/shared/api";
import { Button } from "@/shared/ui";
import { useI18n, isLocale } from "@/shared/i18n";
import { useFormValidation } from "@/shared/ui/use-form-validation";
import {
  usernameRule,
  emailRule,
  passwordRule,
  consentRules,
  formErrorMessage,
  canRetryFormError,
} from "@/shared/lib/form-validation";
type AuthState = {
  user: User | null;
  loading: boolean;
  loggingOut: boolean;
  accept: (data: Schema<"AuthView">) => void;
  updateUser: (user: User) => void;
  logout: () => Promise<void>;
};
const AuthContext = createContext<AuthState | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const { setLocale } = useI18n();
  const queryClient = useQueryClient();
  const revision = useRef(0);
  const [sessionRevision, setSessionRevision] = useState(0);
  const [loggingOut, setLoggingOut] = useState(false);
  const session = useQuery(sessionQuery(sessionRevision));
  const syncLanguage = useEffectEvent(() => {
    if (isLocale(session.data?.locale))
      void setLocale(session.data.locale).catch(() => {});
  });
  useEffect(() => {
    syncLanguage();
  }, [session.data?.id, session.data?.locale]);
  useEffect(
    () =>
      subscribeSessionEnd(() => {
        void queryClient.cancelQueries();
        queryClient.clear();
        revision.current += 1;
        queryClient.setQueryData(sessionQuery(revision.current).queryKey, null);
        setSessionRevision(revision.current);
      }),
    [queryClient],
  );
  const resetCache = (user: User | null) => {
    queryClient.clear();
    revision.current += 1;
    queryClient.setQueryData(sessionQuery(revision.current).queryKey, user);
    setSessionRevision(revision.current);
    return revision.current;
  };
  const updateUser = (user: User) => {
    queryClient.setQueryData(sessionQuery(revision.current).queryKey, user);
    queryClient.setQueryData(userQuery(user.id).queryKey, user);
  };
  const accept = (data: Schema<"AuthView">) => {
    void queryClient.cancelQueries();
    setAccessToken(data.access_token);
    resetCache(data.user);
    updateUser(data.user);
  };
  const logout = async () => {
    // Block refresh and abort old reads/mutations before clearing their caches.
    setLoggingOut(true);
    const token = endSession();
    const cancellation = queryClient.cancelQueries();
    const loggedOutRevision = resetCache(null);
    try {
      await cancellation;
      await revokeSession(token);
    } finally {
      if (revision.current === loggedOutRevision) resetCache(null);
      setLoggingOut(false);
    }
  };
  return (
    <AuthContext
      value={{
        user: session.data ?? null,
        loading: session.isPending,
        loggingOut,
        accept,
        updateUser,
        logout,
      }}
    >
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
  const { text: localize, locale } = useI18n();
  const languageChanging =
    useIsMutating({ mutationKey: ["change-language"] }) > 0;
  const router = useRouter();
  const { accept, loggingOut } = useAuth();
  const validation = useFormValidation({
    ...(mode === "register" ? { username: usernameRule, ...consentRules } : {}),
    email: emailRule,
    password: passwordRule("Пароль", mode === "register" ? 12 : 1),
  });
  const mutation = useMutation({
    mutationKey: ["auth", mode],
    mutationFn: async (body: {
      email: string;
      password: string;
      username: string;
    }) =>
      mode === "register"
        ? unwrap(
            await api.POST("/api/auth/register", {
              body: {
                ...body,
                accept_terms: true,
                accept_data_processing: true,
                legal_version: LEGAL_VERSION,
                locale,
              },
            }),
          )
        : unwrap(
            await api.POST("/api/auth/login", {
              body: { email: body.email, password: body.password },
            }),
          ),
    onSuccess: (data) => {
      accept(data);
      router.replace("/dashboard");
    },
    onError: validation.acceptServerError,
  });
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (
      mutation.isPending ||
      loggingOut ||
      languageChanging ||
      (mutation.isError && !canRetryFormError(mutation.error)) ||
      !validation.validate(event.currentTarget)
    )
      return;
    const form = new FormData(event.currentTarget);
    if (
      mode === "register" &&
      (form.get("acceptTerms") !== "on" ||
        form.get("acceptDataProcessing") !== "on")
    )
      return;
    mutation.mutate({
      email: String(form.get("email")),
      password: String(form.get("password")),
      username: String(form.get("username") ?? ""),
    });
  };
  return (
    <form
      className="auth-form ym-hide-content ym-disable-submit"
      {...validation.formProps}
      onSubmit={submit}
      onChange={(event) => {
        validation.onChange(event);
        if (!mutation.isPending) mutation.reset();
      }}
    >
      {mode === "register" && (
        <label>
          {localize(" Имя пользователя ")}
          <input
            name="username"
            {...validation.field("username")}
            minLength={3}
            maxLength={40}
            pattern="[a-zA-Z0-9_]+"
            required
            autoComplete="username"
            placeholder="python_explorer"
          />
          <small>{localize("Латинские буквы, цифры и подчёркивание.")}</small>
          {validation.error("username")}
        </label>
      )}
      <label>
        Email
        <input
          name="email"
          {...validation.field("email")}
          maxLength={254}
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
        />
        {validation.error("email")}
      </label>
      <label>
        {localize(" Пароль ")}
        <input
          name="password"
          {...validation.field("password")}
          type="password"
          minLength={mode === "register" ? 12 : 1}
          maxLength={128}
          required
          autoComplete={
            mode === "register" ? "new-password" : "current-password"
          }
          placeholder={localize(
            mode === "register" ? "Не менее 12 символов" : "Ваш пароль",
          )}
        />
        {validation.error("password")}
      </label>
      {mode === "register" && <ConsentFields validation={validation} />}
      <LegalLinks />
      {mutation.error && (
        <p className="form-error" role="alert">
          {localize(formErrorMessage(mutation.error, mode))}
        </p>
      )}
      <Button
        type="submit"
        pending={mutation.isPending || loggingOut || languageChanging}
        disabled={
          !validation.valid ||
          (mutation.isError && !canRetryFormError(mutation.error))
        }
      >
        {localize(
          mode === "register" ? "Создать аккаунт" : "Войти в лабораторию",
        )}
      </Button>
      <p className="form-foot">
        {localize(
          mode === "register" ? "Уже учитесь с нами?" : "Пока нет аккаунта?",
        )}{" "}
        <Link href={mode === "register" ? "/login" : "/register"}>
          {localize(mode === "register" ? "Войти" : "Начать обучение")}
        </Link>
      </p>
    </form>
  );
}
