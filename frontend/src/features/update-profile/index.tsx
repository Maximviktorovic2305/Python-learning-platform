"use client";
import { useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { User } from "@/entities/user";
import { api, unwrap, errorMessage } from "@/shared/api";
import { Button } from "@/shared/ui";
export function ProfileForm({
  user,
  onSaved,
}: {
  user: User;
  onSaved: (user: User) => void;
}) {
  const client = useQueryClient();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setPending(true);
    setMessage("");
    try {
      const updated = unwrap(
        await api.PATCH("/api/users/me", {
          body: {
            username: String(data.get("username")),
            daily_goal: Number(data.get("goal")),
            timezone: String(data.get("timezone")),
          },
        }),
      );
      onSaved(updated);
      await client.invalidateQueries({ queryKey: ["user"] });
      await client.invalidateQueries({ queryKey: ["progress"] });
      setMessage("Профиль сохранён.");
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setPending(false);
    }
  };
  return (
    <form onSubmit={submit} className="profile-form">
      <label>
        Имя пользователя
        <input
          name="username"
          defaultValue={user.username}
          required
          minLength={3}
          maxLength={40}
          pattern="[a-zA-Z0-9_]+"
        />
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
          type="number"
          defaultValue={user.daily_goal}
          min={20}
          max={1000}
          required
        />
      </label>
      <label>
        Часовой пояс
        <select name="timezone" defaultValue={user.timezone}>
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
      </label>
      <Button pending={pending}>Сохранить изменения</Button>
      {message && <p role="status">{message}</p>}
    </form>
  );
}
export function PasswordForm({ onChanged }: { onChanged: () => void }) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setPending(true);
    try {
      unwrap(
        await api.POST("/api/users/me/password", {
          body: {
            current_password: String(data.get("current")),
            new_password: String(data.get("next")),
          },
        }),
      );
      onChanged();
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setPending(false);
    }
  };
  return (
    <form onSubmit={submit} className="profile-form">
      <label>
        Текущий пароль
        <input
          name="current"
          type="password"
          maxLength={128}
          required
          autoComplete="current-password"
        />
      </label>
      <label>
        Новый пароль
        <input
          name="next"
          type="password"
          minLength={12}
          maxLength={128}
          required
          autoComplete="new-password"
        />
        <small>
          Не менее 12 символов. После смены пароля потребуется войти снова.
        </small>
      </label>
      <Button className="secondary" pending={pending}>
        Изменить пароль
      </Button>
      {message && <p role="alert">{message}</p>}
    </form>
  );
}
