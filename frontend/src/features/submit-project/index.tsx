"use client";
import { useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api, unwrap, errorMessage } from "@/shared/api";
import { Button } from "@/shared/ui";
export function ProjectForm({ projectId, initialUrl = "", initialNotes = "" }: { projectId: string; initialUrl?: string; initialNotes?: string }) {
  const [pending, setPending] = useState(false); const [message, setMessage] = useState(""); const client = useQueryClient();
  const submit = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const data = new FormData(event.currentTarget); setPending(true); try { unwrap(await api.POST("/api/projects/{project_id}/submissions", { params: { path: { project_id: projectId } }, body: { repository_url: String(data.get("url")), notes: String(data.get("notes")) } })); await client.invalidateQueries({ queryKey: ["submissions"] }); setMessage("Работа сохранена и ожидает проверки администратора."); } catch (error) { setMessage(errorMessage(error)); } finally { setPending(false); } };
  return <form className="profile-form project-form" onSubmit={submit}><label>Ссылка на репозиторий<input name="url" type="url" required defaultValue={initialUrl} placeholder="https://github.com/you/project" /></label><label>Что реализовано и как запустить<textarea name="notes" minLength={20} maxLength={5000} required defaultValue={initialNotes} rows={4} /></label><Button disabled={pending}>{pending ? "Сохраняем…" : "Сохранить работу"}</Button>{message && <p role="status">{message}</p>}</form>;
}
