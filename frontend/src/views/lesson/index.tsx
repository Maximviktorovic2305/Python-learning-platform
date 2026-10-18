"use client";
import { useRef, useState, useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, Clock3, ArrowRight } from "lucide-react";
import Link from "next/link";
import { PageSkeleton, LessonNavigationSkeleton } from "@/widgets/app-shell";
import { CodeEditor } from "@/widgets/code-editor";
import { QuizPanel } from "@/widgets/quiz-panel";
import { LessonNavigation } from "@/widgets/lesson-navigation";
import { lessonQuery, type Lesson } from "@/entities/lesson";
import { courseQuery, allTopics, type Course } from "@/entities/course";
import { exerciseQuery } from "@/entities/exercise";
import {
  progressQuery,
  getTopicStatus,
  TopicStatusBadge,
} from "@/entities/progress";
import { useAuth } from "@/features/auth";
import { CompleteLesson } from "@/features/complete-lesson";
import {
  Button,
  Tag,
  ErrorState,
  Skeleton,
  CachedDataNotice,
} from "@/shared/ui";
import { LearningText } from "@/shared/ui/learning-text";
import { errorMessage } from "@/shared/api";

const lessonSteps = [
  { id: "theory", name: "Теория", action: "Вернуться к теории" },
  { id: "practice", name: "Практика", action: "Перейти к практике" },
  { id: "quiz", name: "Тест", action: "Перейти к тесту" },
  { id: "review", name: "Закрепление", action: "Перейти к закреплению" },
];

const subscribeToClient = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

export function LessonPage({
  id,
  initialTab = "theory",
  initialLesson,
  initialCourse,
}: {
  id: string;
  initialTab?: string;
  initialLesson?: Lesson;
  initialCourse?: Course;
}) {
  const interactive = useSyncExternalStore(
    subscribeToClient,
    clientSnapshot,
    serverSnapshot,
  );
  const [selectedTab, setTab] = useState(
    lessonSteps.some((step) => step.id === initialTab) ? initialTab : "theory",
  );
  const tabsRef = useRef<HTMLDivElement>(null);
  const exerciseSelectorRef = useRef<HTMLDivElement>(null);
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [navOpen, setNavOpen] = useState(false);
  const [quizNavigationVisible, setQuizNavigationVisible] = useState(true);
  const { user, loading } = useAuth();
  const lesson = useQuery({ ...lessonQuery(id), initialData: initialLesson });
  const hasPractice = (lesson.data?.exercise_count ?? 0) > 0;
  const hasQuiz = (lesson.data?.question_count ?? 0) > 0;
  const isStepEnabled = (step: string) =>
    (step !== "practice" || hasPractice) && (step !== "quiz" || hasQuiz);
  const availableSteps = lessonSteps.filter((step) => isStepEnabled(step.id));
  const tab = availableSteps.some((step) => step.id === selectedTab)
    ? selectedTab
    : "theory";
  const theoryNextStep = availableSteps[1]!;
  const course = useQuery({ ...courseQuery, initialData: initialCourse });
  const exercises = useQuery({ ...exerciseQuery(id), enabled: hasPractice });
  const progress = useQuery(progressQuery(user?.id));
  const completed = progress.data?.lesson_ids.includes(id) ?? false;
  const currentExercise = exercises.data?.[exerciseIndex];
  const nextExercise = exercises.data?.[exerciseIndex + 1];
  const topics = course.data
    ? allTopics(course.data).filter((t) => t.published)
    : [];
  const next = topics[topics.findIndex((t) => t.id === id) + 1];
  const stepIndex = availableSteps.findIndex((step) => step.id === tab);
  const previousStep = availableSteps[stepIndex - 1];
  const nextStep = availableSteps[stepIndex + 1];
  const goToStep = (target: string) => {
    if (!isStepEnabled(target)) return;
    setTab(target);
    tabsRef.current?.scrollIntoView({ block: "start" });
    document.getElementById(`tab-${target}`)?.focus({ preventScroll: true });
  };
  const goToExercise = (index: number) => {
    setExerciseIndex(index);
    exerciseSelectorRef.current?.scrollIntoView({ block: "start" });
    exerciseSelectorRef.current
      ?.querySelectorAll("button")
      [index]?.focus({ preventScroll: true });
  };
  return (
    <>
      <CachedDataNotice query={progress} />
      {progress.error && !progress.data ? (
        <ErrorState
          message={errorMessage(progress.error)}
          retry={() => {
            void progress.refetch();
          }}
        />
      ) : lesson.error && !lesson.data ? (
        <ErrorState
          message={errorMessage(lesson.error)}
          retry={() => {
            void lesson.refetch();
          }}
        />
      ) : lesson.data ? (
        <div className="lesson-layout">
          <button
            className="button secondary lesson-nav-toggle"
            aria-controls="lesson-course-navigation"
            disabled={!interactive}
            onClick={() => setNavOpen(!navOpen)}
            aria-expanded={navOpen}
          >
            Навигация по урокам
          </button>
          {course.data ? (
            <div
              id="lesson-course-navigation"
              className={
                navOpen ? "lesson-nav-mobile open" : "lesson-nav-mobile"
              }
            >
              <LessonNavigation
                course={course.data}
                currentId={id}
                progress={progress.data}
              />
            </div>
          ) : course.error ? (
            <div className="lesson-sidebar">
              <ErrorState
                message={errorMessage(course.error)}
                retry={() => {
                  void course.refetch();
                }}
              />
            </div>
          ) : (
            <LessonNavigationSkeleton />
          )}
          <article className="lesson-main">
            <div className="lesson-heading">
              <div className="eyebrow">
                PYTHON / {lesson.data.topic.tags[0]?.toUpperCase()}
              </div>
              <h1>{lesson.data.topic.title}</h1>
              <div className="meta-row">
                <span>
                  <Clock3 size={14} />
                  {lesson.data.topic.minutes} мин
                </span>
                {hasPractice && (
                  <Tag>ПРАКТИКА: {lesson.data.exercise_count}</Tag>
                )}
                {hasQuiz && (
                  <Tag>ВОПРОСОВ В БАНКЕ: {lesson.data.question_count}</Tag>
                )}
                {!hasPractice && !hasQuiz && <Tag>Теория и закрепление</Tag>}
                <TopicStatusBadge
                  status={getTopicStatus(id, progress.data, id)}
                />
                {completed && (
                  <Tag tone="green">
                    <Check size={12} />
                    Теория изучена
                  </Tag>
                )}
              </div>
              {user && progress.data && (!hasPractice || exercises.data) && (
                <p className="muted small-text" aria-live="polite">
                  Теория: {completed ? "изучена" : "не изучена"}
                  {hasPractice && exercises.data && (
                    <>
                      {" "}
                      · Практика:{" "}
                      {
                        exercises.data.filter((exercise) =>
                          progress.data.exercise_ids.includes(exercise.id),
                        ).length
                      }
                      /{exercises.data.length}
                    </>
                  )}
                  {hasQuiz && (
                    <>
                      {" "}
                      · Тест:{" "}
                      {progress.data.quiz_ids.includes(`${id}-quiz`)
                        ? "зачтён"
                        : "не зачтён"}
                    </>
                  )}
                  .
                  {progress.data.completed_topics.includes(id)
                    ? " Тема завершена."
                    : hasPractice || hasQuiz
                      ? " Для завершения темы изучите теорию, решите все задания и сдайте тест на 70% или выше."
                      : " Для завершения этой темы достаточно отметить теорию изученной."}
                </p>
              )}
            </div>
            <div
              className="lesson-tabs"
              ref={tabsRef}
              role="tablist"
              aria-label="Этапы урока"
            >
              {lessonSteps.map((t) => (
                <button
                  role="tab"
                  disabled={!interactive || !isStepEnabled(t.id)}
                  aria-disabled={!isStepEnabled(t.id)}
                  title={
                    !isStepEnabled(t.id)
                      ? "В этой теме этап не предусмотрен"
                      : undefined
                  }
                  aria-selected={tab === t.id}
                  aria-controls={`panel-${t.id}`}
                  id={`tab-${t.id}`}
                  tabIndex={tab === t.id ? 0 : -1}
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                      e.preventDefault();
                      const tabs = availableSteps.map((step) => step.id);
                      const index = tabs.indexOf(t.id);
                      const target =
                        tabs[
                          (index +
                            (e.key === "ArrowRight" ? 1 : tabs.length - 1)) %
                            tabs.length
                        ];
                      if (target) {
                        setTab(target);
                        document.getElementById(`tab-${target}`)?.focus();
                      }
                    }
                  }}
                  className={tab === t.id ? "active" : ""}
                >
                  {t.name}
                </button>
              ))}
            </div>
            <div
              className="lesson-panel"
              role="tabpanel"
              id={`panel-${tab}`}
              aria-labelledby={`tab-${tab}`}
            >
              {tab === "theory" && (
                <div className="theory-content">
                  {lesson.data.theory.map((section) => (
                    <section key={section.title}>
                      <h2>{section.title}</h2>
                      <LearningText text={section.body} />
                    </section>
                  ))}
                  <div className="lesson-bottom">
                    <p>
                      {hasPractice
                        ? "Теперь применим изученное в практике."
                        : "Закрепим основные мысли этой темы."}
                    </p>
                    {loading || (user && progress.isPending) ? (
                      <Skeleton className="skeleton-button" />
                    ) : user ? (
                      <CompleteLesson
                        id={id}
                        userId={user.id}
                        completed={completed}
                        actionLabel={theoryNextStep.action}
                        onComplete={() => goToStep(theoryNextStep.id)}
                      />
                    ) : (
                      <div className="lesson-guest-actions">
                        <Button onClick={() => goToStep(theoryNextStep.id)}>
                          {theoryNextStep.action} <ArrowRight size={16} />
                        </Button>
                        <Link href="/register" className="button secondary">
                          Создать аккаунт и сохранить прогресс
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {tab === "practice" && (
                <div>
                  {loading || (user && progress.isPending) ? (
                    <PageSkeleton variant="exercise" />
                  ) : exercises.error ? (
                    <ErrorState
                      message={errorMessage(exercises.error)}
                      retry={() => {
                        void exercises.refetch();
                      }}
                    />
                  ) : currentExercise ? (
                    <>
                      <div
                        className="exercise-selector"
                        ref={exerciseSelectorRef}
                        aria-label="Выбор задания"
                      >
                        {exercises.data?.map((exercise, i) => (
                          <button
                            key={exercise.id}
                            className={`${i === exerciseIndex ? "active" : ""} ${progress.data?.exercise_ids.includes(exercise.id) ? "completed" : ""}`}
                            aria-label={`Задание ${i + 1}, ${exercise.difficulty}`}
                            aria-pressed={i === exerciseIndex}
                            onClick={() => setExerciseIndex(i)}
                          >
                            {progress.data?.exercise_ids.includes(
                              exercise.id,
                            ) ? (
                              <Check size={13} />
                            ) : (
                              i + 1
                            )}
                            <i
                              className={`difficulty-${exercise.difficulty}`}
                            />
                          </button>
                        ))}
                      </div>
                      <CodeEditor
                        key={`${currentExercise.id}-${user?.id ?? "guest"}`}
                        exercise={currentExercise}
                        completed={
                          progress.data?.exercise_ids.includes(
                            currentExercise.id,
                          ) ?? false
                        }
                      />
                    </>
                  ) : (
                    <PageSkeleton variant="exercise" />
                  )}
                </div>
              )}
              {tab === "quiz" && (
                <QuizPanel
                  key={`${id}-${user?.id ?? "guest"}`}
                  topicId={id}
                  onNavigationChange={setQuizNavigationVisible}
                />
              )}
              {tab === "review" && (
                <div className="review-content">
                  <div className="eyebrow">TAKEAWAYS</div>
                  <h2>Что важно сохранить в памяти.</h2>
                  <ul>
                    {lesson.data.review.map((point) => (
                      <li key={point}>
                        <Check size={17} />
                        {point}
                      </li>
                    ))}
                  </ul>
                  <p>
                    Вернитесь к теории, объясните разобранный код своими словами
                    {hasQuiz ? " и пройдите ещё одну попытку теста." : "."}{" "}
                    Повторение помогает заметить границы, которые легко
                    пропустить при первом чтении.
                  </p>
                  {next && (
                    <Link className="button" href={`/learn/${next.id}`}>
                      Следующая тема: {next.title}
                      <ArrowRight size={16} />
                    </Link>
                  )}
                </div>
              )}
              {previousStep && (tab !== "quiz" || quizNavigationVisible) && (
                <nav
                  className="lesson-bottom"
                  aria-label="Переходы между этапами"
                >
                  <Button
                    className="secondary"
                    onClick={() =>
                      tab === "practice" && exerciseIndex > 0
                        ? goToExercise(exerciseIndex - 1)
                        : goToStep(previousStep.id)
                    }
                  >
                    {tab === "practice" && exerciseIndex > 0
                      ? "Предыдущее задание"
                      : `Назад: ${previousStep.name}`}
                  </Button>
                  {nextStep && (
                    <Button
                      disabled={tab === "practice" && !currentExercise}
                      onClick={() =>
                        tab === "practice" && nextExercise
                          ? goToExercise(exerciseIndex + 1)
                          : goToStep(nextStep.id)
                      }
                    >
                      {tab === "practice" && nextExercise
                        ? "Следующее задание"
                        : nextStep.action}{" "}
                      <ArrowRight size={15} />
                    </Button>
                  )}
                </nav>
              )}
            </div>
          </article>
        </div>
      ) : (
        <PageSkeleton variant="lesson" />
      )}
    </>
  );
}
