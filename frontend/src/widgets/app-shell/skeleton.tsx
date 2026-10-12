import {
  Skeleton,
  SkeletonRegion,
  SkeletonLines,
  SkeletonCode,
} from "@/shared/ui";

export type PageSkeletonVariant =
  | "dashboard"
  | "curriculum"
  | "practice"
  | "projects"
  | "achievements"
  | "profile"
  | "lesson"
  | "exercise";

function HeadingSkeleton() {
  return (
    <div className="skeleton-heading">
      <Skeleton width="28%" height={10} />
      <Skeleton width="68%" height={38} />
      <Skeleton width="82%" height={13} />
    </div>
  );
}

function CardSkeleton({ medal = false }: { medal?: boolean }) {
  return (
    <div className={`skeleton-card ${medal ? "skeleton-medal-card" : ""}`}>
      <Skeleton
        width={medal ? 64 : 36}
        height={medal ? 64 : 36}
        circle={medal}
      />
      <Skeleton width="72%" height={21} />
      <SkeletonLines />
      <div className="skeleton-row">
        <Skeleton width={60} height={23} />
        <Skeleton width={70} height={23} />
      </div>
      <Skeleton width="100%" height={1} />
      <Skeleton width="45%" height={12} />
    </div>
  );
}

function FormSkeleton({ fields = 4 }: { fields?: number }) {
  return (
    <div className="skeleton-form">
      {Array.from({ length: fields }, (_, index) => (
        <div key={index}>
          <Skeleton width="35%" height={12} />
          <Skeleton height={45} />
        </div>
      ))}
      <Skeleton width="60%" height={44} />
    </div>
  );
}

export function LessonNavigationSkeleton() {
  return (
    <SkeletonRegion
      label="Загружаем навигацию по урокам…"
      className="skeleton-lesson-nav"
    >
      <div className="skeleton-card">
        <Skeleton width="70%" height={14} />
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="skeleton-stack">
            <Skeleton width="80%" height={18} />
            <SkeletonLines count={4} />
          </div>
        ))}
      </div>
    </SkeletonRegion>
  );
}

function ExerciseSkeleton() {
  return (
    <div className="skeleton-stack">
      <div className="skeleton-row">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} width={33} height={33} />
        ))}
      </div>
      <Skeleton width="55%" height={27} />
      <SkeletonLines />
      <div className="skeleton-editor">
        <div className="skeleton-row">
          <Skeleton width={120} height={12} />
          <Skeleton width={60} height={18} />
        </div>
        <SkeletonCode count={8} />
        <div className="skeleton-row">
          <Skeleton width={150} height={40} />
          <Skeleton width={140} height={40} />
        </div>
        <SkeletonLines count={2} />
      </div>
    </div>
  );
}

export function PageSkeleton({
  variant = "dashboard",
  heading = false,
}: {
  variant?: PageSkeletonVariant;
  heading?: boolean;
}) {
  return (
    <SkeletonRegion
      label={
        variant === "lesson"
          ? "Загружаем урок…"
          : variant === "exercise"
            ? "Загружаем задание…"
            : "Загружаем страницу…"
      }
      className={`page-skeleton skeleton-${variant}`}
    >
      {heading && variant !== "lesson" && <HeadingSkeleton />}
      {variant === "dashboard" && (
        <>
          <div className="dashboard-metrics">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="skeleton-stack">
                <Skeleton width={24} height={24} />
                <Skeleton width="50%" height={36} />
                <Skeleton width="72%" height={12} />
              </div>
            ))}
          </div>
          <div className="dashboard-main-grid">
            <div className="skeleton-card">
              <Skeleton width="30%" height={12} />
              <Skeleton width="72%" height={32} />
              <SkeletonLines />
              <Skeleton height={7} />
              <Skeleton width={190} height={44} />
            </div>
            <div className="skeleton-card">
              <Skeleton width="60%" height={20} />
              <Skeleton width={120} height={120} circle />
              <SkeletonLines count={2} />
            </div>
          </div>
          <div className="skeleton-two-columns">
            <CardSkeleton />
            <CardSkeleton />
          </div>
        </>
      )}
      {variant === "curriculum" && (
        <div className="skeleton-stack">
          {Array.from({ length: 3 }, (_, i) => (
            <div className="skeleton-course-level" key={i}>
              <Skeleton width={40} height={40} />
              <div className="skeleton-card">
                <Skeleton width="55%" height={24} />
                <SkeletonLines count={2} />
                {Array.from({ length: 4 }, (_, j) => (
                  <div className="skeleton-course-row" key={j}>
                    <Skeleton width={24} height={24} circle />
                    <Skeleton width={`${68 - j * 7}%`} height={14} />
                    <Skeleton width={45} height={18} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      {(variant === "practice" || variant === "achievements") && (
        <div
          className={
            variant === "practice" ? "practice-grid" : "achievements-grid"
          }
        >
          {Array.from({ length: variant === "practice" ? 6 : 8 }, (_, i) => (
            <CardSkeleton key={i} medal={variant === "achievements"} />
          ))}
        </div>
      )}
      {variant === "projects" && (
        <div className="projects-list">
          {Array.from({ length: 3 }, (_, i) => (
            <div className="project-detail" key={i}>
              <div className="skeleton-stack">
                <Skeleton width="75%" height={12} />
                <Skeleton width={42} height={42} />
                <Skeleton width={85} height={25} />
              </div>
              <div className="skeleton-stack">
                <Skeleton width="65%" height={30} />
                <SkeletonLines />
                <div className="skeleton-two-columns">
                  <SkeletonLines count={4} />
                  <SkeletonLines count={4} />
                </div>
                <Skeleton width={170} height={28} />
              </div>
            </div>
          ))}
        </div>
      )}
      {variant === "profile" && (
        <div className="profile-grid">
          <div className="skeleton-card">
            <div className="skeleton-row">
              <Skeleton width={60} height={60} circle />
              <div className="skeleton-stack skeleton-grow">
                <Skeleton width="70%" height={23} />
                <Skeleton width="40%" height={18} />
              </div>
            </div>
            <FormSkeleton />
          </div>
          <div className="skeleton-card">
            <Skeleton width="60%" height={22} />
            <FormSkeleton fields={2} />
          </div>
        </div>
      )}
      {variant === "lesson" && (
        <div className="lesson-layout">
          <div className="skeleton-lesson-nav">
            <div className="skeleton-card">
              <Skeleton width="70%" height={14} />
              <SkeletonLines count={4} />
              <SkeletonLines count={4} />
            </div>
          </div>
          <div className="skeleton-stack">
            <HeadingSkeleton />
            <div className="skeleton-row">
              {Array.from({ length: 5 }, (_, i) => (
                <Skeleton key={i} width={85} height={35} />
              ))}
            </div>
            <SkeletonLines count={4} />
            <div className="skeleton-editor">
              <SkeletonCode />
            </div>
            <SkeletonLines count={4} />
            <Skeleton width={200} height={44} />
          </div>
        </div>
      )}
      {variant === "exercise" && <ExerciseSkeleton />}
    </SkeletonRegion>
  );
}

export function AppShellSkeleton({
  variant = "dashboard",
}: {
  variant?: PageSkeletonVariant;
}) {
  return (
    <div className="app-shell shell-skeleton">
      <aside className="app-sidebar" aria-hidden="true">
        <div className="skeleton-row skeleton-sidebar-brand">
          <Skeleton width={32} height={32} />
          <Skeleton width={120} height={20} />
        </div>
        <div className="skeleton-stack skeleton-sidebar-nav">
          {Array.from({ length: 6 }, (_, i) => (
            <div className="skeleton-row" key={i}>
              <Skeleton width={18} height={18} />
              <Skeleton width={`${65 + (i % 3) * 8}%`} height={15} />
            </div>
          ))}
        </div>
        <div className="skeleton-card">
          <SkeletonLines count={3} />
          <Skeleton height={38} />
        </div>
        <div className="sidebar-bottom">
          <div className="skeleton-row">
            <Skeleton width={36} height={36} circle />
            <Skeleton width={110} height={14} />
          </div>
        </div>
      </aside>
      <div className="app-body">
        <div className="app-topbar" aria-hidden="true">
          <Skeleton width={180} height={12} />
          <Skeleton width={32} height={32} circle />
        </div>
        <main id="main" className="app-content">
          <PageSkeleton variant={variant} heading />
        </main>
      </div>
    </div>
  );
}

export function PublicSkeleton({
  auth,
  register = false,
}: {
  auth?: boolean;
  register?: boolean;
}) {
  return (
    <>
      <div className="skeleton-public-header" aria-hidden="true">
        <div className="container skeleton-row">
          <Skeleton width={150} height={26} />
          <Skeleton width={140} height={38} />
        </div>
      </div>
      <main id="main" className="container">
        <SkeletonRegion
          label="Загружаем страницу…"
          className={auth ? "skeleton-auth" : "skeleton-landing"}
        >
          <div className="skeleton-public-columns">
            <div className="skeleton-stack">
              <Skeleton width="35%" height={12} />
              <Skeleton width="90%" height={54} />
              <Skeleton width="70%" height={44} />
              <SkeletonLines />
              <Skeleton width={180} height={44} />
            </div>
            <div className="skeleton-card">
              {auth ? (
                <>
                  <Skeleton width="60%" height={28} />
                  <SkeletonLines count={2} />
                  <FormSkeleton fields={register ? 3 : 2} />
                </>
              ) : (
                <>
                  <Skeleton width={170} height={170} circle />
                  <SkeletonCode count={6} />
                </>
              )}
            </div>
          </div>
        </SkeletonRegion>
      </main>
    </>
  );
}
