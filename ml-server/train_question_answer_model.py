from src.question_answer_ml import train_question_models

metrics = train_question_models()

print("=" * 80)
print("QUESTION ML MODEL TRAINED")
print("=" * 80)
print("Dataset rows:", metrics["datasetRows"])
print("Answer candidate samples:", metrics["answerCandidateSamples"])
print("Positive samples:", metrics["positiveSamples"])
print("Negative samples:", metrics["negativeSamples"])
print("Accuracy:", metrics["answerSelector"]["accuracy"])
print("Precision:", metrics["answerSelector"]["precision"])
print("Recall:", metrics["answerSelector"]["recall"])
print("F1:", metrics["answerSelector"]["f1"])
print("Saved model: models/question_answer_selector.joblib")
print("Saved metrics: chapter4_test_results/question_answer_model_metrics.json")
