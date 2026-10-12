from datetime import UTC, datetime, timedelta
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.learning import percentage, select_questions
from app.models.tables import Answer, Question, QuestionMemory, Quiz, QuizAttempt, Topic, User
from app.schemas.contracts import (
    AnswerReview,
    AttemptResult,
    AttemptSubmission,
    AttemptView,
    QuestionView,
)
from app.services.progress import award, grant_achievements


async def start_attempt(session: AsyncSession, user: User, topic_id: str) -> AttemptView:
    topic = await session.get(Topic, topic_id)
    quiz = await session.get(Quiz, f"{topic_id}-quiz")
    if topic is None or not topic.published or quiz is None:
        raise HTTPException(404, "Тест не опубликован")
    pool = list(await session.scalars(select(Question).where(Question.topic_id == topic_id)))
    selected = select_questions(pool, quiz.distribution)
    attempt = QuizAttempt(user_id=user.id, quiz_id=quiz.id, question_ids=[q.id for q in selected])
    session.add(attempt)
    await session.flush()
    return AttemptView(id=attempt.id, quiz_id=quiz.id, created_at=attempt.created_at,
                       questions=[QuestionView.model_validate(q) for q in selected])


async def submit_attempt(session: AsyncSession, user: User, attempt_id: UUID, payload: AttemptSubmission) -> AttemptResult:
    # Lock ordering is user -> attempt throughout all activity writers.
    await session.refresh(user, with_for_update=True)
    attempt = await session.scalar(select(QuizAttempt).where(QuizAttempt.id == attempt_id,
                                   QuizAttempt.user_id == user.id).with_for_update())
    if attempt is None:
        raise HTTPException(404, "Попытка не найдена")
    if attempt.finished_at is not None:
        return await attempt_result(session, attempt)
    ids = [a.question_id for a in payload.answers]
    if len(ids) != len(set(ids)) or set(ids) != set(attempt.question_ids):
        raise HTTPException(422, "Ответьте на все вопросы этой попытки ровно один раз")
    if datetime.now(UTC) - attempt.created_at.replace(tzinfo=UTC) > timedelta(hours=2):
        raise HTTPException(409, "Время попытки истекло; начните новый тест")
    questions = {q.id: q for q in await session.scalars(select(Question).where(Question.id.in_(ids)))}
    correct_count = 0
    now = datetime.now(UTC)
    for submitted in payload.answers:
        question = questions[submitted.question_id]
        selected = submitted.selected
        if len(selected) != len(set(selected)) or any(i < 0 or i >= len(question.options) for i in selected):
            raise HTTPException(422, "Некорректный вариант ответа")
        if question.kind != "multiple_select" and len(selected) != 1:
            raise HTTPException(422, "Выберите один вариант")
        correct = set(selected) == set(question.correct_answer)
        correct_count += correct
        session.add(Answer(attempt_id=attempt.id, question_id=question.id, selected=selected, correct=correct))
        memory = await session.get(QuestionMemory, (user.id, question.id))
        if memory is None:
            memory = QuestionMemory(user_id=user.id, question_id=question.id, correct_count=0, wrong_count=0, confidence=0)
            session.add(memory)
        memory.correct_count += int(correct)
        memory.wrong_count += int(not correct)
        memory.last_answered = now
        memory.confidence = memory.correct_count / (memory.correct_count + memory.wrong_count)
        memory.next_review = now.date() + timedelta(days=3 if correct else 1)
    attempt.score = percentage(correct_count, len(ids))
    attempt.finished_at = now
    await session.flush()
    quiz = await session.get(Quiz, attempt.quiz_id)
    if attempt.score >= 70 and quiz is not None:
        attempt.xp_awarded = await award(session, user, "quiz", quiz.id, quiz.topic_id, 50)
    await grant_achievements(session, user)
    await session.flush()
    return await attempt_result(session, attempt)


async def attempt_result(session: AsyncSession, attempt: QuizAttempt) -> AttemptResult:
    if attempt.finished_at is None or attempt.score is None:
        raise HTTPException(409, "Тест ещё не завершён")
    questions = {q.id: q for q in await session.scalars(select(Question).where(Question.id.in_(attempt.question_ids)))}
    answers = {a.question_id: a for a in await session.scalars(select(Answer).where(Answer.attempt_id == attempt.id))}
    review = [AnswerReview(question=QuestionView.model_validate(questions[qid]),
              selected=answers[qid].selected, correct_answer=questions[qid].correct_answer,
              correct=answers[qid].correct, explanation=questions[qid].explanation) for qid in attempt.question_ids]
    return AttemptResult(id=attempt.id, score=attempt.score, correct_count=sum(a.correct for a in answers.values()),
        total=len(answers), seconds=max(0, int((attempt.finished_at.replace(tzinfo=UTC) - attempt.created_at.replace(tzinfo=UTC)).total_seconds())),
        xp=attempt.xp_awarded, review=review)
