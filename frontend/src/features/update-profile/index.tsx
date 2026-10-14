"use client";
import type { FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { userQuery, type User } from "@/entities/user";
import { api, unwrap, ApiError, type Schema } from "@/shared/api";
import { Button } from "@/shared/ui";
import { useFormValidation } from "@/shared/ui/use-form-validation";
import {
  usernameRule,
  passwordRule,
  formErrorMessage,
  canRetryFormError,
} from "@/shared/lib/form-validation";
export function ProfileForm({
  user,
  onSaved,
}: {
  user: User;
  onSaved: (user: User) => void;
}) {
  const client = useQueryClient();
  const validation = useFormValidation(
    {
      username: usernameRule,
      goal: {
        label: "Ежедневная цель, XP",
        apiName: "daily_goal",
        validate: (value) =>
          typeof value === "string" &&
          value.trim() !== "" &&
          Number.isInteger(Number(value)) &&
          Number(value) >= 20 &&
          Number(value) <= 1000
            ? ""
            : "Введите ежедневную цель: целое число от 20 до 1000 XP.",
      },
      timezone: {
        label: "Часовой пояс",
        validate: (value) => {
          try {
            if (typeof value === "string" && value && value.length <= 64) {
              new Intl.DateTimeFormat("ru", { timeZone: value });
              return "";
            }
          } catch {}
          return "Выберите допустимый часовой пояс из списка.";
        },
      },
    },
    {
      username: user.username,
      goal: String(user.daily_goal),
      timezone: user.timezone,
    },
  );
  const mutation = useMutation({
    mutationKey: ["update-profile", user.id],
    mutationFn: async (body: Schema<"ProfileUpdate">) =>
      unwrap(
        await api.PATCH("/api/users/me", {
          body,
        }),
      ),
    onSuccess: async (updated) => {
      onSaved(updated);
      client.setQueryData(userQuery(user.id).queryKey, updated);
      await client.invalidateQueries({ queryKey: ["progress"] });
    },
    onError: validation.acceptServerError,
  });
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (
      mutation.isPending ||
      (mutation.isError && !canRetryFormError(mutation.error)) ||
      !validation.validate(event.currentTarget)
    )
      return;
    const data = new FormData(event.currentTarget);
    mutation.mutate({
      username: String(data.get("username")),
      daily_goal: Number(data.get("goal")),
      timezone: String(data.get("timezone")),
    });
  };
  return (
    <form
      {...validation.formProps}
      onSubmit={submit}
      className="profile-form"
      onChange={(event) => {
        validation.onChange(event);
        if (!mutation.isPending) mutation.reset();
      }}
    >
      <label>
        Имя пользователя
        <input
          name="username"
          {...validation.field("username")}
          defaultValue={user.username}
          required
          minLength={3}
          maxLength={40}
          pattern="[a-zA-Z0-9_]+"
        />
        {validation.error("username")}
      </label>
      <label>
        Email
        <input value={user.email} readOnly type="email" />
        <small>Email используется для входа.</small>
      </label>
      <label>
        Ежедневная цель, XP
        <input
          name="goal"
          {...validation.field("goal")}
          type="number"
          defaultValue={user.daily_goal}
          min={20}
          max={1000}
          step={1}
          required
        />
        {validation.error("goal")}
      </label>
      <label>
        Часовой пояс
        <select
          name="timezone"
          defaultValue={user.timezone}
          {...validation.field("timezone")}
          required
        >
          {Array.from(
            new Set([
              user.timezone,
              "Asia/Vladivostok",
              "Europe/Moscow",
              "Asia/Yekaterinburg",
              "Asia/Novosibirsk",
              "UTC",
            ]),
          ).map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
        <small>Серия занятий и дневная цель учитывают ваш часовой пояс.</small>
        {validation.error("timezone")}
      </label>
      <Button
        type="submit"
        pending={mutation.isPending}
        disabled={
          !validation.valid ||
          (mutation.isError && !canRetryFormError(mutation.error))
        }
      >
        Сохранить изменения
      </Button>
      {mutation.error && (
        <p className="form-error" role="alert">
          {formErrorMessage(mutation.error)}
        </p>
      )}
      {mutation.isSuccess && <p role="status">Профиль сохранён.</p>}
    </form>
  );
}
export function PasswordForm({ onChanged }: { onChanged: () => void }) {
  const validation = useFormValidation({
    current: {
      ...passwordRule("Текущий пароль", 1, "current_password"),
      serverError: "Проверьте текущий пароль и введите его ещё раз.",
    },
    next: passwordRule("Новый пароль", 12, "new_password"),
  });
  const mutation = useMutation({
    mutationKey: ["change-password"],
    mutationFn: async (body: Schema<"PasswordChange">) =>
      unwrap(await api.POST("/api/users/me/password", { body })),
    onSuccess: onChanged,
    onError: (error) =>
      validation.acceptServerError(
        error instanceof ApiError && error.status === 400
          ? new ApiError(400, "", ["current_password"])
          : error,
      ),
  });
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (
      mutation.isPending ||
      (mutation.isError && !canRetryFormError(mutation.error)) ||
      !validation.validate(event.currentTarget)
    )
      return;
    const data = new FormData(event.currentTarget);
    mutation.mutate({
      current_password: String(data.get("current")),
      new_password: String(data.get("next")),
    });
  };
  return (
    <form
      {...validation.formProps}
      onSubmit={submit}
      className="profile-form"
      onChange={(event) => {
        validation.onChange(event);
        if (!mutation.isPending) mutation.reset();
      }}
    >
      <label>
        Текущий пароль
        <input
          name="current"
          {...validation.field("current")}
          type="password"
          maxLength={128}
          required
          autoComplete="current-password"
        />
        {validation.error("current")}
      </label>
      <label>
        Новый пароль
        <input
          name="next"
          {...validation.field("next")}
          type="password"
          minLength={12}
          maxLength={128}
          required
          autoComplete="new-password"
        />
        <small>
          Не менее 12 символов. После смены пароля потребуется войти снова.
        </small>
        {validation.error("next")}
      </label>
      <Button
        type="submit"
        className="secondary"
        pending={mutation.isPending}
        disabled={
          !validation.valid ||
          (mutation.isError && !canRetryFormError(mutation.error))
        }
      >
        Изменить пароль
      </Button>
      {mutation.error && (
        <p className="form-error" role="alert">
          {formErrorMessage(mutation.error)}
        </p>
      )}
    </form>
  );
}
