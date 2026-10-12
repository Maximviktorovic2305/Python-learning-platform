import Link from "next/link";
import { Check, ChevronRight, BookOpen } from "lucide-react";
import type { Course } from "@/entities/course";
export function LessonNavigation({
  course,
  currentId,
  completed,
}: {
  course: Course;
  currentId: string;
  completed: string[];
}) {
  return (
    <aside className="lesson-sidebar">
      <Link href="/curriculum">
        <BookOpen size={16} />
        Программа курса
      </Link>
      <nav aria-label="Уроки курса">
        {course.levels.slice(0, 3).map((level) => (
          <details
            open={level.modules.some((m) =>
              m.topics.some((t) => t.id === currentId),
            )}
            key={level.id}
          >
            <summary>
              <span>0{level.position}</span>
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
                  >
                    <span>
                      {completed.includes(topic.id) ? (
                        <Check size={14} />
                      ) : (
                        <i />
                      )}
                    </span>
                    {topic.title}
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
