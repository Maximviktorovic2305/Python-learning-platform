"use client";
import { useI18n } from "@/shared/i18n";

import { useQuery } from "@tanstack/react-query";
import { FolderCode, ArrowUpRight, Check, ClipboardList } from "lucide-react";
import Link from "next/link";
import { PageSkeleton } from "@/widgets/app-shell";
import { projectsQuery, submissionsQuery } from "@/entities/project";
import { useAuth } from "@/features/auth";
import { ProjectForm } from "@/features/submit-project";
import { PageHeading, Tag, ErrorState, CachedDataNotice } from "@/shared/ui";
import { errorMessage, type Schema } from "@/shared/api";
export function ProjectsPage({
  initialProjects,
}: {
  initialProjects?: Schema<"ProjectView">[];
}) {
  const { text: localize } = useI18n();

  const { user } = useAuth();
  const projects = useQuery({ ...projectsQuery, initialData: initialProjects });
  const submissions = useQuery(submissionsQuery(user?.id));
  return (
    <>
      <CachedDataNotice query={projects} />
      <CachedDataNotice query={submissions} />
      <PageHeading
        eyebrow={localize("Проекты")}
        title={localize("От знаний к работающим вещам.")}
        description={localize(
          "Четыре проекта, чтобы связать отдельные темы в полноценное приложение.",
        )}
      />
      {projects.isPending ? (
        <PageSkeleton variant="projects" />
      ) : projects.error && !projects.data ? (
        <ErrorState
          message={localize(errorMessage(projects.error))}
          retry={() => {
            void projects.refetch();
          }}
        />
      ) : submissions.error && !submissions.data ? (
        <ErrorState
          message={localize(errorMessage(submissions.error))}
          retry={() => {
            void submissions.refetch();
          }}
        />
      ) : (
        <div className="projects-list">
          {projects.data.map((project, i) => {
            const submission = submissions.data?.find(
              (s) => s.project_id === project.id,
            );
            return (
              <article key={project.id} className="project-detail">
                <div className="project-detail-label">
                  <span>
                    PROJECT {localize(String(i + 1).padStart(2, "0"))}
                  </span>
                  <FolderCode size={35} />
                  <Tag tone="blue">
                    LEVEL {localize(project.level_id.replace("level-", ""))}
                  </Tag>
                </div>
                <div>
                  <h2>{localize(project.title)}</h2>
                  <p>{localize(project.description)}</p>
                  <div className="project-requirements">
                    <div>
                      <h3>{localize("Что построить")}</h3>
                      <ul>
                        {project.requirements.map((r) => (
                          <li key={r}>
                            <Check size={14} />
                            {localize(r)}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h3>{localize("Критерии проверки")}</h3>
                      <ul>
                        {project.rubric.map((r) => (
                          <li key={r}>
                            <ClipboardList size={14} />
                            {localize(r)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <div className="project-submit-header">
                    <Tag
                      tone={submission?.status === "approved" ? "green" : ""}
                    >
                      {localize(
                        submission?.status === "approved"
                          ? "ПРИНЯТО · +500 XP"
                          : submission
                            ? "ОЖИДАЕТ ПРОВЕРКИ"
                            : "САМОСТОЯТЕЛЬНЫЙ ПРОЕКТ",
                      )}
                    </Tag>
                    {!user && (
                      <Link href="/register" className="text-link">
                        {localize(" Создать аккаунт ")}
                        <ArrowUpRight size={16} />
                      </Link>
                    )}
                  </div>
                  {user &&
                    !submissions.isPending &&
                    submission?.status !== "approved" && (
                      <details>
                        <summary>
                          {localize(
                            submission
                              ? "Обновить работу"
                              : "Отправить свою работу",
                          )}
                          <ArrowUpRight size={16} />
                        </summary>
                        <ProjectForm
                          key={`${project.id}:${user.id}`}
                          projectId={project.id}
                          initialUrl={submission?.repository_url}
                          initialNotes={submission?.notes}
                        />
                      </details>
                    )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
