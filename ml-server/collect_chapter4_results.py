import json
from pathlib import Path

FILES = {
    "debugData": Path("chapter4_test_results/debug_data.json"),
    "recommendationTrain": Path("chapter4_test_results/train_result.json"),
    "strongQuizModelMetrics": Path("chapter4_test_results/strong_quiz_model_metrics.json"),
    "strongQuizExample": Path("chapter4_test_results/generate_strong_result.json"),
    "quizQualitySummary": Path("chapter4_test_results/quiz_quality/quiz_quality_summary.json"),
    "apiTestSummary": Path("chapter4_test_results/api_test_summary.json"),
}

result = {}

for key, path in FILES.items():
    if not path.exists():
        result[key] = {
            "missing": True,
            "path": str(path),
        }
        continue

    try:
        with open(path, "r", encoding="utf-8-sig") as file:
            result[key] = json.load(file)
    except Exception as error:
        result[key] = {
            "readError": True,
            "path": str(path),
            "error": str(error),
        }

output = Path("chapter4_test_results/chapter4_final_report_data.json")

with open(output, "w", encoding="utf-8") as file:
    json.dump(result, file, ensure_ascii=False, indent=2)

print("DONE")
print("Saved:", output)
print()

for key, value in result.items():
    if isinstance(value, dict) and value.get("missing"):
        status = "MISSING"
    elif isinstance(value, dict) and value.get("readError"):
        status = "READ_ERROR"
    else:
        status = "OK"

    print(f"{key}: {status}")
