import json
from pathlib import Path

from src.dataset_loader import prepare_qa_dataset, load_prepared_dataset
from src.answer_candidate_model import AnswerCandidateModel, MODEL_PATH


REPORT_PATH = Path(__file__).resolve().parents[1] / "models" / "training_report.json"


def main():
    dataset = load_prepared_dataset()

    if len(dataset) < 100:
        dataset = prepare_qa_dataset(limit=3000)

    print(f"Dataset records: {len(dataset)}")

    model = AnswerCandidateModel()

    report = model.train(
        dataset=dataset,
        max_records=min(2500, len(dataset))
    )

    model.save(MODEL_PATH)

    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)

    with open(REPORT_PATH, "w", encoding="utf-8") as file:
        json.dump(report, file, ensure_ascii=False, indent=2)

    print("Answer candidate model trained.")
    print(f"Model saved to: {MODEL_PATH}")
    print(f"Report saved to: {REPORT_PATH}")
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
