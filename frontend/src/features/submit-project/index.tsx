"use client";
import type { FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, unwrap, errorMessage, type Schema } from "@/shared/api";
import { Button } from "@/shared/ui";
export function ProjectForm({
  projectId,
  initialUrl = "",
  initialNotes = "",
}: {
  projectId: string;
  initialUrl?: string;
  initialNotes?: string;
}) {
  const client = useQueryClient();
  const mutation = useMutation({
    mutationKey: ["submit-project", projectId],
    mutationFn: async (body: Schema<"ProjectInput">) =>
      unwrap(
        await api.POST("/api/projects/{project_id}/submissions", {
          params: { path: { project_id: projectId } },
          body,
        }),
      ),
    onSuccess: () => client.invalidateQueries({ queryKey: ["submissions"] }),
  });
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    mutation.mutate({
      repository_url: String(data.get("url")),
      notes: String(data.get("notes")),
    });
  };
  return (
    <form className="profile-form project-form" onSubmit={submit}>
      <label>
        Ссылка на репозиторий
        <input
          name="url"
          type="url"
          required
          defaultValue={initialUrl}
          placeholder="https://github.com/you/project"
        />
      </label>
      <label>
        Что реализовано и как запустить
        <textarea
          name="notes"
          minLength={20}
          maxLength={5000}
          required
          defaultValue={initialNotes}
          rows={4}
        />
      </label>
      <Button pending={mutation.isPending}>Сохранить работу</Button>
      {mutation.error && <p role="alert">{errorMessage(mutation.error)}</p>}
      {mutation.isSuccess && (
        <p role="status">Работа сохранена и ожидает проверки администратора.</p>
      )}
    </form>
  );
}
