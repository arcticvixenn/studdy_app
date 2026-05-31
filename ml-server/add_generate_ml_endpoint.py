from pathlib import Path

path = Path("server.py")
content = path.read_text(encoding="utf-8")

marker = "# CHAPTER4_TRAINED_ML_QUIZ_ENDPOINT"

if marker in content:
    print("Endpoint already exists")
    raise SystemExit(0)

append_code = r'''

# CHAPTER4_TRAINED_ML_QUIZ_ENDPOINT
# Endpoint для генерації тестових питань на основі навченої ML-моделі.
from src.question_answer_ml import generate_quiz_with_ml as _chapter4_generate_quiz_with_ml


@app.post("/quiz/generate-ml")
def generate_quiz_ml(payload: dict):
    try:
        return _chapter4_generate_quiz_with_ml(payload)
    except FileNotFoundError as error:
        raise HTTPException(
            status_code=500,
            detail=f"ML-модель не знайдена. Спочатку запустіть train_question_answer_model.py. {error}",
        )
    except Exception as error:
        raise HTTPException(status_code=400, detail=str(error))
'''

backup = path.with_name("server.py.bak.add_generate_ml")
backup.write_text(content, encoding="utf-8")

path.write_text(content + append_code, encoding="utf-8")

print("DONE added /quiz/generate-ml")
print(f"Backup: {backup}")
