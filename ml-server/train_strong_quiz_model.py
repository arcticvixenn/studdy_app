from src.strong_quiz_ml import train_strong_quiz_model

metrics = train_strong_quiz_model()

print("=" * 80)
print("STRONG QUIZ ML MODEL TRAINED")
print("=" * 80)
print("Dataset rows:", metrics["datasetRows"])
print("Pair samples:", metrics["pairSamples"])
print("Positive samples:", metrics["positiveSamples"])
print("Negative samples:", metrics["negativeSamples"])
print("Accuracy:", metrics["answerRanker"]["accuracy"])
print("Precision:", metrics["answerRanker"]["precision"])
print("Recall:", metrics["answerRanker"]["recall"])
print("F1:", metrics["answerRanker"]["f1"])
print("Saved model: models/strong_quiz_model.joblib")
print("Saved metrics: chapter4_test_results/strong_quiz_model_metrics.json")
