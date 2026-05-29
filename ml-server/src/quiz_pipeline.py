from typing import Dict

from src.text_preprocessor import split_sentences
from src.keyword_extractor import KeywordExtractor
from src.topic_model import TopicModel
from src.difficulty_model import DifficultyModel
from src.question_generator import QuestionGenerator


class QuizPipeline:
    def __init__(self):
        self.keyword_extractor = KeywordExtractor(max_keywords=20)
        self.topic_model = TopicModel(max_topics=3)
        self.difficulty_model = DifficultyModel()
        self.question_generator = QuestionGenerator()

    def generate_quiz(self, title: str, text: str, question_count: int = 5) -> Dict:
        sentences = split_sentences(text)

        if len(sentences) < 2:
            return {
                "title": f"Тест: {title}",
                "source": "local_ml_pipeline",
                "error": "Недостатньо навчального тексту для генерації тесту.",
                "questions": [],
                "keywords": [],
                "topics": []
            }

        self.difficulty_model.train(sentences)

        keyword_items = self.keyword_extractor.extract_keywords(text)
        keywords = [item["keyword"] for item in keyword_items]

        topics = self.topic_model.detect_topics(text)

        main_topic = title if title else "Навчальний матеріал"

        questions = self.question_generator.generate_questions(
            text=text,
            keywords=keywords,
            difficulty_model=self.difficulty_model,
            topic=main_topic,
            count=question_count
        )

        return {
            "title": f"Тест: {title}",
            "source": "local_ml_pipeline",
            "modelDescription": {
                "textAnalysis": "TF-IDF keyword extraction",
                "topicDetection": "KMeans clustering over TF-IDF sentence vectors",
                "difficultyPrediction": "RandomForestClassifier over sentence features",
                "questionGeneration": "ML-assisted extractive question generation"
            },
            "statistics": {
                "sentenceCount": len(sentences),
                "keywordCount": len(keywords),
                "topicCount": len(topics),
                "questionCount": len(questions)
            },
            "keywords": keyword_items,
            "topics": topics,
            "questions": questions,
            "error": None
        }
