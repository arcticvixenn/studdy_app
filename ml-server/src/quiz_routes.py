from typing import Optional

from fastapi import APIRouter
from pydantic import BaseModel, Field

from src.quiz_pipeline import QuizPipeline


router = APIRouter(prefix="/quiz", tags=["ML Quiz Generation"])

pipeline = QuizPipeline()


class QuizGenerateRequest(BaseModel):
    title: str = Field(..., min_length=2, description="Назва теми або уроку")
    text: str = Field(..., min_length=80, description="Навчальний текст для аналізу")
    questionCount: Optional[int] = Field(default=5, ge=1, le=15)


@router.get("/health")
def quiz_health():
    return {
        "ok": True,
        "module": "local_ml_quiz_generator",
        "description": "Local ML/NLP quiz generation module based on educational text"
    }


@router.post("/generate")
def generate_quiz(request: QuizGenerateRequest):
    quiz = pipeline.generate_quiz(
        title=request.title,
        text=request.text,
        question_count=request.questionCount or 5
    )

    return quiz
