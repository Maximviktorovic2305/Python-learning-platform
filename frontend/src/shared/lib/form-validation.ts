import { ApiError } from "../api/client";

export type FieldRule = {
  label: string;
  apiName?: string;
  serverError?: string;
  validate: (value: string | boolean) => string;
};
export type FormRules = Record<string, FieldRule>;

export const usernameRule: FieldRule = {
  label: "Имя пользователя",
  validate: (value) =>
    typeof value !== "string" || !/^[a-zA-Z0-9_]{3,40}$/.test(value)
      ? "Введите имя пользователя: от 3 до 40 символов, только латинские буквы, цифры и подчёркивание."
      : "",
};
export const emailRule: FieldRule = {
  label: "Email",
  validate: (value) =>
    typeof value !== "string" ||
    value.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
      ? "Введите email в формате name@example.com (не более 254 символов)."
      : "",
};
export function passwordRule(
  label: string,
  minLength: number,
  apiName?: string,
): FieldRule {
  return {
    label,
    apiName,
    validate: (value) => {
      // Count Unicode code points like the API; never trim or echo passwords.
      const length = typeof value === "string" ? [...value].length : 0;
      return length < minLength || length > 128
        ? minLength === 1
          ? `Введите ${label.toLowerCase()} (не более 128 символов).`
          : `${label}: введите от ${minLength} до 128 символов.`
        : "";
    },
  };
}
export const consentRules: FormRules = {
  acceptTerms: {
    label: "Принимаю условия использования",
    apiName: "accept_terms",
    validate: (value) =>
      value === true
        ? ""
        : "Для регистрации подтвердите принятие условий использования.",
  },
  acceptDataProcessing: {
    label: "Даю согласие на обработку персональных данных",
    apiName: "accept_data_processing",
    validate: (value) =>
      value === true
        ? ""
        : "Для регистрации подтвердите согласие на обработку персональных данных.",
  },
};
export const projectRules: FormRules = {
  url: {
    label: "Ссылка на репозиторий",
    apiName: "repository_url",
    validate: (value) => {
      try {
        const url = new URL(String(value));
        if (
          ["http:", "https:"].includes(url.protocol) &&
          url.hostname &&
          String(value).length <= 2083
        )
          return "";
      } catch {}
      return "Введите полную ссылку на репозиторий, начинающуюся с https:// или http:// (не более 2083 символов).";
    },
  },
  notes: {
    label: "Что реализовано и как запустить",
    validate: (value) =>
      typeof value === "string" &&
      [...value].length >= 20 &&
      [...value].length <= 5000 &&
      value.trim().length > 0
        ? ""
        : "Опишите, что реализовано и как запустить проект: от 20 до 5000 символов.",
  },
};

export function serverFieldErrors(
  error: unknown,
  rules: FormRules,
): Record<string, string> {
  if (!(error instanceof ApiError)) return {};
  const errors: Record<string, string> = {};
  for (const field of error.fields) {
    const match = Object.entries(rules).find(
      ([name, rule]) => (rule.apiName ?? name) === field,
    );
    if (match) {
      const [name, rule] = match;
      errors[name] =
        rule.serverError ||
        rule.validate("") ||
        `Проверьте поле «${rule.label}» и выберите допустимое значение.`;
    }
  }
  return errors;
}

export function canRetryFormError(error: unknown): boolean {
  return (
    !(error instanceof ApiError) || error.status === 429 || error.status >= 500
  );
}

export function formErrorMessage(
  error: unknown,
  mode?: "login" | "register",
): string {
  if (!(error instanceof ApiError))
    return "Не удалось связаться с сервером. Проверьте соединение и повторите попытку.";
  if (error.status === 429)
    return "Слишком много попыток. Подождите минуту и повторите запрос.";
  if (error.status >= 500)
    return "Сервис временно недоступен. Попробуйте ещё раз позже.";
  if (mode === "login" && error.status === 401)
    return "Неверный email или пароль. Проверьте оба поля и попробуйте снова.";
  if (mode === "register" && error.status === 409)
    return "Не удалось создать аккаунт с этими данными. Измените имя пользователя или email либо попробуйте войти.";
  if (error.status === 422)
    return "Проверьте отмеченные поля и исправьте введённые данные.";
  if (error.status === 401)
    return "Сессия завершена. Войдите снова и повторите действие.";
  if (error.status === 400)
    return "Не удалось сохранить изменения. Проверьте введённые данные и попробуйте снова.";
  return "Не удалось выполнить действие. Проверьте данные и повторите попытку.";
}
