import json
from pathlib import Path
import matplotlib.pyplot as plt

input_path = Path("chapter6_results/chapter6_fast_report_v2.json")
out_dir = Path("chapter6_results")
out_dir.mkdir(exist_ok=True)

data = json.loads(input_path.read_text(encoding="utf-8"))
summary = data["summary"]

labels = [
    "Health",
    "Нормальний текст",
    "Довший текст",
    "Неінформативний текст"
]

values = [
    summary["quiz_health_time_ms"],
    summary["normal_generation_time_ms"],
    summary["long_generation_time_ms"],
    summary["bad_generation_time_ms"]
]

plt.figure(figsize=(9, 5))
plt.bar(labels, values)
plt.ylabel("Час виконання, мс")
plt.title("Порівняння часу відповіді ML API у тестових сценаріях")
plt.xticks(rotation=15, ha="right")
plt.tight_layout()

out_path = out_dir / "chapter6_response_time_chart.png"
plt.savefig(out_path, dpi=200)
print(f"Saved: {out_path}")
