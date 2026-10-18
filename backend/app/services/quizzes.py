from datetime import UTC, datetime, timedelta
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.errors import Conflict, ResourceNotFound, UnprocessableInput
from app.domain.learning import percentage, select_questions
from app.models.tables import Answer, QuestionMemory, QuizAttempt, User
from app.repositories import learning as records
from app.repositories.users import lock_user
from app.schemas.contracts import (
    AnswerReview,
    AttemptResult,
    AttemptSubmission,
    AttemptView,
    QuestionView,
)
from app.services.progress import award, grant_achievements


async def start_attempt(session: AsyncSession, user: User, topic_id: str) -> AttemptView:
    topic = await records.topic(session, topic_id)
    quiz = await records.quiz(session, f"{topic_id}-quiz")
    if topic is None or not topic.published or quiz is None:
        raise ResourceNotFound("Тест не опубликован")
    pool = await records.questions(session, topic_id)
    selected = select_questions(
        pool,
        quiz.distribution,
        avoid_ids=await records.recent_question_ids(session, user.id, quiz.id),
    )
    attempt = QuizAttempt(user_id=user.id, quiz_id=quiz.id, question_ids=[q.id for q in selected])
    session.add(attempt)
    await session.flush()
    return AttemptView(
        id=attempt.id,
        quiz_id=quiz.id,
        created_at=attempt.created_at,
        questions=[QuestionView.model_validate(q) for q in selected],
    )


async def submit_attempt(
    session: AsyncSession, user: User, attempt_id: UUID, payload: AttemptSubmission
) -> AttemptResult:
    # Lock ordering is user -> attempt throughout all activity writers.
    await lock_user(session, user)
    attempt = await records.attempt_for_user(session, attempt_id, user.id, lock=True)
    if attempt is None:
        raise ResourceNotFound("Попытка не найдена")
    if attempt.finished_at is not None:
        return await attempt_result(session, attempt)
    ids = [a.question_id for a in payload.answers]
    if len(ids) != len(set(ids)) or set(ids) != set(attempt.question_ids):
        raise UnprocessableInput("Ответьте на все вопросы этой попытки ровно один раз")
    if datetime.now(UTC) - attempt.created_at.replace(tzinfo=UTC) > timedelta(hours=2):
        raise Conflict("Время попытки истекло; начните новый тест")
    questions = await records.questions_by_ids(session, ids)
    correct_count = 0
    now = datetime.now(UTC)
    for submitted in payload.answers:
        question = questions[submitted.question_id]
        selected = submitted.selected
        if len(selected) != len(set(selected)) or any(
            i < 0 or i >= len(question.options) for i in selected
        ):
            raise UnprocessableInput("Некорректный вариант ответа")
        if question.kind != "multiple_select" and len(selected) != 1:
            raise UnprocessableInput("Выберите один вариант")
        correct = set(selected) == set(question.correct_answer)
        correct_count += correct
        session.add(
            Answer(
                attempt_id=attempt.id, question_id=question.id, selected=selected, correct=correct
            )
        )
        memory = await records.question_memory(session, user.id, question.id)
        if memory is None:
            memory = QuestionMemory(
                user_id=user.id,
                question_id=question.id,
                correct_count=0,
                wrong_count=0,
                confidence=0,
            )
            session.add(memory)
        memory.correct_count += int(correct)
        memory.wrong_count += int(not correct)
        memory.last_answered = now
        memory.confidence = memory.correct_count / (memory.correct_count + memory.wrong_count)
        memory.next_review = now.date() + timedelta(days=3 if correct else 1)
    attempt.score = percentage(correct_count, len(ids))
    attempt.finished_at = now
    await session.flush()
    quiz = await records.quiz(session, attempt.quiz_id)
    if attempt.score >= 70 and quiz is not None:
        attempt.xp_awarded = await award(session, user, "quiz", quiz.id, quiz.topic_id, 50)
    await grant_achievements(session, user)
    await session.flush()
    return await attempt_result(session, attempt)


async def attempt_result(session: AsyncSession, attempt: QuizAttempt) -> AttemptResult:
    if attempt.finished_at is None or attempt.score is None:
        raise Conflict("Тест ещё не завершён")
    questions = await records.questions_by_ids(session, attempt.question_ids)
    answers = await records.attempt_answers(session, attempt.id)
    review = [
        AnswerReview(
            question=QuestionView.model_validate(questions[qid]),
            selected=answers[qid].selected,
            correct_answer=questions[qid].correct_answer,
            correct=answers[qid].correct,
            explanation=questions[qid].explanation,
        )
        for qid in attempt.question_ids
    ]
    return AttemptResult(
        id=attempt.id,
        score=attempt.score,
        correct_count=sum(a.correct for a in answers.values()),
        total=len(answers),
        seconds=max(
            0,
            int(
                (
                    attempt.finished_at.replace(tzinfo=UTC) - attempt.created_at.replace(tzinfo=UTC)
                ).total_seconds()
            ),
        ),
        xp=attempt.xp_awarded,
        review=review,
    )


async def get_attempt(session: AsyncSession, user: User, attempt_id: UUID) -> AttemptResult:
    attempt = await records.attempt_for_user(session, attempt_id, user.id)
    if attempt is None:
        raise ResourceNotFound("Попытка не найдена")
    return await attempt_result(session, attempt)
