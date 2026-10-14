"use client";
import type { FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, unwrap, type Schema } from "@/shared/api";
import { Button } from "@/shared/ui";
import { useFormValidation } from "@/shared/ui/use-form-validation";
import {
  projectRules,
  formErrorMessage,
  canRetryFormError,
} from "@/shared/lib/form-validation";
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
  const validation = useFormValidation(projectRules, {
    url: initialUrl,
    notes: initialNotes,
  });
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
      repository_url: String(data.get("url")),
      notes: String(data.get("notes")),
    });
  };
  return (
    <form
      {...validation.formProps}
      className="profile-form project-form"
      onSubmit={submit}
      onChange={(event) => {
        validation.onChange(event);
        if (!mutation.isPending) mutation.reset();
      }}
    >
      <label>
        Ссылка на репозиторий
        <input
          name="url"
          {...validation.field("url")}
          maxLength={2083}
          type="url"
          required
          defaultValue={initialUrl}
          placeholder="https://github.com/you/project"
        />
        {validation.error("url")}
      </label>
      <label>
        Что реализовано и как запустить
        <textarea
          name="notes"
          {...validation.field("notes")}
          minLength={20}
          maxLength={5000}
          required
          defaultValue={initialNotes}
          rows={4}
        />
        {validation.error("notes")}
      </label>
      <Button
        type="submit"
        pending={mutation.isPending}
        disabled={
          !validation.valid ||
          (mutation.isError && !canRetryFormError(mutation.error))
        }
      >
        Сохранить работу
      </Button>
      {mutation.error && (
        <p className="form-error" role="alert">
          {formErrorMessage(mutation.error)}
        </p>
      )}
      {mutation.isSuccess && (
        <p role="status">Работа сохранена и ожидает проверки администратора.</p>
      )}
    </form>
  );
}
