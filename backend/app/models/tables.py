from datetime import date, datetime
from uuid import UUID, uuid4

from sqlalchemy import (
    JSON,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class Timestamped:
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class User(Timestamped, Base):
    __tablename__ = "users"
    __table_args__ = (CheckConstraint("total_xp >= 0 AND streak >= 0 AND longest_streak >= 0"),)
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    email: Mapped[str] = mapped_column(String(254), unique=True)
    username: Mapped[str] = mapped_column(String(40), unique=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    terms_version: Mapped[str | None] = mapped_column(String(32))
    data_consent_version: Mapped[str | None] = mapped_column(String(32))
    legal_accepted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    avatar: Mapped[str | None] = mapped_column(String(500))
    role: Mapped[str] = mapped_column(String(20), default="student")
    total_xp: Mapped[int] = mapped_column(default=0)
    current_level: Mapped[int] = mapped_column(default=0)
    streak: Mapped[int] = mapped_column(default=0)
    longest_streak: Mapped[int] = mapped_column(default=0)
    last_activity: Mapped[date | None]
    daily_goal: Mapped[int] = mapped_column(default=100)
    timezone: Mapped[str] = mapped_column(String(64), default="Asia/Vladivostok")


class AuthSession(Base):
    __tablename__ = "auth_sessions"
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    revoked: Mapped[bool] = mapped_column(default=False)


class UsedRefreshToken(Base):
    """Retain only digests so replay can revoke the original session."""

    __tablename__ = "used_refresh_tokens"
    token_hash: Mapped[str] = mapped_column(String(64), primary_key=True)
    session_id: Mapped[UUID] = mapped_column(
        ForeignKey("auth_sessions.id", ondelete="CASCADE"), index=True
    )


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    consumed: Mapped[bool] = mapped_column(default=False)


class Course(Timestamped, Base):
    __tablename__ = "courses"
    id: Mapped[str] = mapped_column(String(80), primary_key=True)
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str]


class Level(Base):
    __tablename__ = "levels"
    __table_args__ = (UniqueConstraint("course_id", "position"),)
    id: Mapped[str] = mapped_column(String(80), primary_key=True)
    course_id: Mapped[str] = mapped_column(ForeignKey("courses.id", ondelete="CASCADE"), index=True)
    position: Mapped[int]
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str]


class Module(Base):
    __tablename__ = "modules"
    __table_args__ = (UniqueConstraint("level_id", "position"),)
    id: Mapped[str] = mapped_column(String(80), primary_key=True)
    level_id: Mapped[str] = mapped_column(ForeignKey("levels.id", ondelete="CASCADE"), index=True)
    position: Mapped[int]
    title: Mapped[str] = mapped_column(String(200))


class Topic(Base):
    __tablename__ = "topics"
    __table_args__ = (UniqueConstraint("module_id", "position"),)
    id: Mapped[str] = mapped_column(String(80), primary_key=True)
    module_id: Mapped[str] = mapped_column(ForeignKey("modules.id", ondelete="CASCADE"), index=True)
    position: Mapped[int]
    title: Mapped[str] = mapped_column(String(200))
    summary: Mapped[str]
    minutes: Mapped[int]
    published: Mapped[bool] = mapped_column(default=False)
    tags: Mapped[list[str]] = mapped_column(JSON)


class Lesson(Base):
    __tablename__ = "lessons"
    id: Mapped[str] = mapped_column(ForeignKey("topics.id", ondelete="CASCADE"), primary_key=True)
    theory: Mapped[list[dict[str, str]]] = mapped_column(JSON)
    examples: Mapped[list[dict[str, str]]] = mapped_column(JSON)
    review: Mapped[list[str]] = mapped_column(JSON)


class Exercise(Base):
    __tablename__ = "exercises"
    id: Mapped[str] = mapped_column(String(100), primary_key=True)
    topic_id: Mapped[str] = mapped_column(ForeignKey("topics.id", ondelete="CASCADE"), index=True)
    title: Mapped[str]
    description: Mapped[str]
    difficulty: Mapped[str] = mapped_column(String(10))
    kind: Mapped[str] = mapped_column(String(30))
    starter_code: Mapped[str]
    solution: Mapped[str]
    hints: Mapped[list[str]] = mapped_column(JSON)


class ExerciseTest(Base):
    __tablename__ = "exercise_tests"
    id: Mapped[str] = mapped_column(String(120), primary_key=True)
    exercise_id: Mapped[str] = mapped_column(
        ForeignKey("exercises.id", ondelete="CASCADE"), index=True
    )
    stdin: Mapped[str]
    expected_stdout: Mapped[str]


class Question(Base):
    __tablename__ = "questions"
    id: Mapped[str] = mapped_column(String(100), primary_key=True)
    topic_id: Mapped[str] = mapped_column(ForeignKey("topics.id", ondelete="CASCADE"), index=True)
    difficulty: Mapped[str] = mapped_column(String(10), index=True)
    kind: Mapped[str] = mapped_column(String(30))
    prompt: Mapped[str]
    code: Mapped[str | None]
    options: Mapped[list[str]] = mapped_column(JSON)
    correct_answer: Mapped[list[int]] = mapped_column(JSON)
    explanation: Mapped[str]
    hint: Mapped[str]
    tags: Mapped[list[str]] = mapped_column(JSON)


class Quiz(Base):
    __tablename__ = "quizzes"
    id: Mapped[str] = mapped_column(String(100), primary_key=True)
    topic_id: Mapped[str] = mapped_column(ForeignKey("topics.id", ondelete="CASCADE"), index=True)
    title: Mapped[str]
    distribution: Mapped[dict[str, int]] = mapped_column(JSON)


class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"
    __table_args__ = (Index("ix_attempts_user_created", "user_id", "created_at"),)
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    quiz_id: Mapped[str] = mapped_column(ForeignKey("quizzes.id"), index=True)
    question_ids: Mapped[list[str]] = mapped_column(JSON)
    score: Mapped[int | None]
    xp_awarded: Mapped[int] = mapped_column(default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class Answer(Base):
    __tablename__ = "answers"
    __table_args__ = (UniqueConstraint("attempt_id", "question_id"),)
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    attempt_id: Mapped[UUID] = mapped_column(
        ForeignKey("quiz_attempts.id", ondelete="CASCADE"), index=True
    )
    question_id: Mapped[str] = mapped_column(ForeignKey("questions.id"))
    selected: Mapped[list[int]] = mapped_column(JSON)
    correct: Mapped[bool]


class Completion(Base):
    """Append-only XP ledger and idempotent completion, shared across learning activities."""

    __tablename__ = "completions"
    __table_args__ = (
        UniqueConstraint("user_id", "kind", "resource_id"),
        CheckConstraint("xp >= 0"),
        Index("ix_completions_user_day", "user_id", "activity_date"),
    )
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    topic_id: Mapped[str | None] = mapped_column(
        ForeignKey("topics.id", ondelete="CASCADE"), index=True
    )
    kind: Mapped[str] = mapped_column(String(20))
    resource_id: Mapped[str] = mapped_column(String(100))
    xp: Mapped[int]
    activity_date: Mapped[date]
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class QuestionMemory(Base):
    __tablename__ = "question_memory"
    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    question_id: Mapped[str] = mapped_column(
        ForeignKey("questions.id", ondelete="CASCADE"), primary_key=True
    )
    correct_count: Mapped[int] = mapped_column(default=0)
    wrong_count: Mapped[int] = mapped_column(default=0)
    confidence: Mapped[float] = mapped_column(default=0)
    last_answered: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    next_review: Mapped[date]


class Project(Base):
    __tablename__ = "projects"
    id: Mapped[str] = mapped_column(String(80), primary_key=True)
    level_id: Mapped[str] = mapped_column(ForeignKey("levels.id"), index=True)
    title: Mapped[str]
    description: Mapped[str]
    requirements: Mapped[list[str]] = mapped_column(JSON)
    rubric: Mapped[list[str]] = mapped_column(JSON)


class ProjectSubmission(Timestamped, Base):
    __tablename__ = "project_submissions"
    __table_args__ = (UniqueConstraint("user_id", "project_id"),)
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id"))
    repository_url: Mapped[str]
    notes: Mapped[str]
    status: Mapped[str] = mapped_column(String(20), default="submitted")


class Achievement(Base):
    __tablename__ = "achievements"
    id: Mapped[str] = mapped_column(String(80), primary_key=True)
    title: Mapped[str]
    description: Mapped[str]
    metric: Mapped[str] = mapped_column(String(30))
    threshold: Mapped[int]


class UserAchievement(Base):
    __tablename__ = "user_achievements"
    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    achievement_id: Mapped[str] = mapped_column(ForeignKey("achievements.id"), primary_key=True)
    earned_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
