"use client";
import { useI18n } from "@/shared/i18n";
import Link from "next/link";
import { Check, ChevronRight, BookOpen, Clock3, Circle } from "lucide-react";
import type { Course } from "@/entities/course";
import {
  getTopicStatus,
  TopicStatusBadge,
  type Progress,
} from "@/entities/progress";
export function LessonNavigation({
  course,
  currentId,
  progress,
}: {
  course: Course;
  currentId: string;
  progress?: Progress;
}) {
  const { text: localize } = useI18n();

  return (
    <aside className="lesson-sidebar">
      <Link href="/curriculum">
        <BookOpen size={16} />
        {localize(" Программа курса ")}
      </Link>
      <nav aria-label={localize("Уроки курса")}>
        {course.levels.map((level) => (
          <details
            open={level.modules.some((m) =>
              m.topics.some((t) => t.id === currentId),
            )}
            key={level.id}
          >
            <summary>
              <span>
                {localize(String(level.position + 1).padStart(2, "0"))}
              </span>
              {localize(level.title)}
              <ChevronRight size={14} />
            </summary>
            {level.modules.map((module) => (
              <div key={module.id}>
                <h4>{localize(module.title)}</h4>
                {module.topics.map((topic) => (
                  <Link
                    href={`/learn/${topic.id}`}
                    key={topic.id}
                    className={currentId === topic.id ? "current" : ""}
                    aria-current={currentId === topic.id ? "page" : undefined}
                    data-topic-status={getTopicStatus(
                      topic.id,
                      progress,
                      currentId,
                    )}
                  >
                    <span className="topic-state-icon" aria-hidden="true">
                      {getTopicStatus(topic.id, progress, currentId) ===
                      "completed" ? (
                        <Check size={14} />
                      ) : getTopicStatus(topic.id, progress, currentId) ===
                        "in-progress" ? (
                        <Clock3 size={14} />
                      ) : (
                        <Circle size={12} />
                      )}
                    </span>
                    <div className="lesson-topic-content">
                      <span>{localize(topic.title)}</span>
                      <TopicStatusBadge
                        status={getTopicStatus(topic.id, progress, currentId)}
                        icon={false}
                      />
                      {currentId === topic.id && (
                        <small className="topic-current-label">
                          {localize(" Вы сейчас здесь ")}
                        </small>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            ))}
          </details>
        ))}
      </nav>
    </aside>
  );
}
