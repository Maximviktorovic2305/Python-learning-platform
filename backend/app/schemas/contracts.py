from datetime import datetime
from typing import Literal
from uuid import UUID
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from pydantic import BaseModel, ConfigDict, EmailStr, Field, HttpUrl, field_validator


class Contract(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="forbid")


class Register(Contract):
    accept_terms: bool = Field(strict=True)
    accept_data_processing: bool = Field(strict=True)
    legal_version: Literal["2026-10-13"]

    @field_validator("accept_terms", "accept_data_processing")
    @classmethod
    def require_consent(cls, value: bool) -> bool:
        if not value:
            raise ValueError("Для регистрации необходимо отдельное подтверждение")
        return value

    email: EmailStr
    username: str = Field(min_length=3, max_length=40, pattern=r"^[a-zA-Z0-9_]+$")
    password: str = Field(min_length=12, max_length=128)


class Login(Contract):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class UserView(Contract):
    id: UUID
    email: str
    username: str
    avatar: str | None
    role: str
    total_xp: int
    current_level: int
    streak: int
    longest_streak: int
    daily_goal: int
    timezone: str
    created_at: datetime


class AuthView(Contract):
    access_token: str
    user: UserView


class ProfileUpdate(Contract):
    username: str = Field(min_length=3, max_length=40, pattern=r"^[a-zA-Z0-9_]+$")
    daily_goal: int = Field(ge=20, le=1000)
    timezone: str = Field(max_length=64)

    @field_validator("timezone")
    @classmethod
    def validate_timezone(cls, value: str) -> str:
        try:
            ZoneInfo(value)
        except ZoneInfoNotFoundError as error:
            raise ValueError("Неизвестный часовой пояс") from error
        return value


class PasswordChange(Contract):
    current_password: str = Field(max_length=128)
    new_password: str = Field(min_length=12, max_length=128)


class Message(Contract):
    message: str


class TopicView(Contract):
    id: str
    module_id: str
    position: int
    title: str
    summary: str
    minutes: int
    published: bool
    tags: list[str]


class ModuleView(Contract):
    id: str
    level_id: str
    position: int
    title: str
    topics: list[TopicView]


class LevelView(Contract):
    id: str
    course_id: str
    position: int
    title: str
    description: str
    modules: list[ModuleView]


class CourseView(Contract):
    id: str
    title: str
    description: str
    levels: list[LevelView]
    published_topics: int
    exercise_count: int
    question_count: int


class TheorySection(Contract):
    title: str
    body: str


class CodeExample(Contract):
    title: str
    code: str
    output: str
    explanation: str


class LessonView(Contract):
    id: str
    topic: TopicView
    theory: list[TheorySection]
    examples: list[CodeExample]
    review: list[str]


class ExerciseView(Contract):
    id: str
    topic_id: str
    title: str
    description: str
    difficulty: str
    kind: str
    starter_code: str
    hints: list[str]


class QuestionView(Contract):
    id: str
    difficulty: str
    kind: str
    prompt: str
    code: str | None
    options: list[str]
    hint: str
    tags: list[str]


class AttemptView(Contract):
    id: UUID
    quiz_id: str
    questions: list[QuestionView]
    created_at: datetime


class SubmittedAnswer(Contract):
    question_id: str
    selected: list[int] = Field(max_length=10)


class AttemptSubmission(Contract):
    answers: list[SubmittedAnswer] = Field(max_length=50)


class AnswerReview(Contract):
    question: QuestionView
    selected: list[int]
    correct_answer: list[int]
    correct: bool
    explanation: str


class AttemptResult(Contract):
    id: UUID
    score: int
    correct_count: int
    total: int
    seconds: int
    xp: int
    review: list[AnswerReview]


class CompletionView(Contract):
    kind: str
    resource_id: str
    topic_id: str | None
    xp: int
    created_at: datetime


class WeakTopic(Contract):
    id: str
    title: str
    accuracy: int
    answers: int


class ProgressView(Contract):
    user: UserView
    lesson_ids: list[str]
    exercise_ids: list[str]
    quiz_ids: list[str]
    completed_topics: list[str]
    continue_topic: str | None
    course_percent: int
    level_percent: dict[str, int]
    module_percent: dict[str, int]
    daily_xp: int
    activity: list[CompletionView]
    weak_topics: list[WeakTopic]
    week_xp: list[int]


class AchievementView(Contract):
    id: str
    title: str
    description: str
    threshold: int
    earned_at: datetime | None


class ProjectView(Contract):
    id: str
    level_id: str
    title: str
    description: str
    requirements: list[str]
    rubric: list[str]


class ProjectInput(Contract):
    repository_url: HttpUrl
    notes: str = Field(min_length=20, max_length=5000)

    @field_validator("notes")
    @classmethod
    def require_description(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Добавьте описание выполненного проекта")
        return value


class ProjectSubmissionView(Contract):
    id: UUID
    project_id: str
    repository_url: str
    notes: str
    status: str


class CodeSubmission(Contract):
    code: str = Field(min_length=1, max_length=20000)


class ExecutionResult(Contract):
    status: Literal["passed", "failed", "error", "timeout"]
    stdout: str
    stderr: str
    passed: int
    total: int
    xp: int = 0
