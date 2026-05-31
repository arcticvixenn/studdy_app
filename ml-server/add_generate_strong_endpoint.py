from pathlib import Path

path = Path("server.py")
content = path.read_text(encoding="utf-8")

marker = "# CHAPTER4_STRONG_QUIZ_ML_ENDPOINT"

if marker in content:
    print("Endpoint already exists")
    raise SystemExit(0)

append_code = r'''

# CHAPTER4_STRONG_QUIZ_ML_ENDPOINT
# Endpoint для генерації тестових питань на основі навченої ML-моделі.
from src.strong_quiz_ml import generate_strong_quiz as _chapter4_generate_strong_quiz


@app.post("/quiz/generate-strong")
def generate_quiz_strong(payload: dict):
    try:
        return _chapter4_generate_strong_quiz(payload)
    except FileNotFoundError as error:
        raise HTTPException(
            status_code=500,
            detail=f"ML-модель не знайдена. Спочатку запустіть train_strong_quiz_model.py. {error}",
        )
    except Exception as error:
        raise HTTPException(status_code=400, detail=str(error))
'''

backup = path.with_name("server.py.bak.add_generate_strong")
backup.write_text(content, encoding="utf-8")

path.write_text(content + append_code, encoding="utf-8")

print("DONE added /quiz/generate-strong")
print(f"Backup: {backup}")
