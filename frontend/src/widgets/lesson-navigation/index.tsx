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
  return (
    <aside className="lesson-sidebar">
      <Link href="/curriculum">
        <BookOpen size={16} />
        Программа курса
      </Link>
      <nav aria-label="Уроки курса">
        {course.levels.map((level) => (
          <details
            open={level.modules.some((m) =>
              m.topics.some((t) => t.id === currentId),
            )}
            key={level.id}
          >
            <summary>
              <span>{String(level.position + 1).padStart(2, "0")}</span>
              {level.title}
              <ChevronRight size={14} />
            </summary>
            {level.modules.map((module) => (
              <div key={module.id}>
                <h4>{module.title}</h4>
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
                      <span>{topic.title}</span>
                      <TopicStatusBadge
                        status={getTopicStatus(topic.id, progress, currentId)}
                        icon={false}
                      />
                      {currentId === topic.id && (
                        <small className="topic-current-label">
                          Вы сейчас здесь
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
