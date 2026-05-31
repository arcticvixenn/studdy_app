import matplotlib.pyplot as plt
from pathlib import Path

out_dir = Path("chapter5_results")
out_dir.mkdir(exist_ok=True)

models = [
    "Answer Selector",
    "Answer Ranker",
    "Training model"
]

accuracy = [0.907, 0.9951, 0.6939]
precision = [1.0, 0.9778, 0.0577]
recall = [0.3333, 0.9778, 0.5082]

x = range(len(models))
width = 0.25

plt.figure(figsize=(10, 5))
plt.bar([i - width for i in x], accuracy, width, label="Accuracy")
plt.bar(x, precision, width, label="Precision")
plt.bar([i + width for i in x], recall, width, label="Recall")

plt.xticks(list(x), models, rotation=10, ha="right")
plt.ylabel("Значення метрики")
plt.title("Порівняння метрик ML-моделей")
plt.ylim(0, 1.1)
plt.legend()
plt.tight_layout()

path = out_dir / "chapter5_model_metrics_comparison.png"
plt.savefig(path, dpi=200)
print(f"Saved: {path}")
