const fs = require("fs");

const path = "lib/appwrite.js";
let content = fs.readFileSync(path, "utf8");

const backup = `${path}.bak.hard_clean_mojibake_${Date.now()}`;
fs.copyFileSync(path, backup);

const badPattern = /Р[’ЎЋџВ°-я]|С[–—”ЃЏѓ]|вЂ|в„|рџ|тА|╬/;

function safeReplacement(context) {
  const before = context.slice(-160);

  if (/throw new Error|Alert\.alert|error/i.test(before)) {
    return "Помилка виконання дії.";
  }

  if (/authorName|username|userName/i.test(before)) {
    return "Користувач Studdy";
  }

  if (/modelType/i.test(before)) {
    return "Гібридна рекомендаційна модель Studdy";
  }

  if (/reason|explanation/i.test(before)) {
    return "Рекомендовано Studdy ML на основі теми, активності та схожості матеріалу.";
  }

  if (/title/i.test(before)) {
    return "Навчальний матеріал";
  }

  if (/description|subtitle|content/i.test(before)) {
    return "Матеріал підібрано для покращення навчального прогресу.";
  }

  if (/icon/i.test(before)) {
    return "🏆";
  }

  if (/topic|category/i.test(before)) {
    return "Загальна тема";
  }

  return "Навчальний матеріал";
}

// чистимо всі string literals із кракозябрами
content = content.replace(
  /(["'`])((?:\\.|(?!\1)[\s\S])*?)\1/g,
  (match, quote, body, offset) => {
    if (!badPattern.test(body)) return match;

    // Не чіпаємо template strings з ${}, щоб не зламати JS-вставки
    if (quote === "`" && body.includes("${")) {
      return "`Рекомендовано Studdy ML на основі теми, активності та схожості матеріалу.`";
    }

    const replacement = safeReplacement(content.slice(Math.max(0, offset - 200), offset));
    return `${quote}${replacement}${quote}`;
  }
);

// додатково чистимо явні англійські/старі modelType
content = content
  .replace(/Hybrid Content recommendation \+ NLP text similarity \+ diversity filter/g, "Гібридна рекомендаційна модель Studdy")
  .replace(/Hybrid Content recommendation/g, "Гібридна рекомендаційна модель Studdy")
  .replace(/NLP text similarity/g, "NLP-схожість тексту");

// гарантуємо нормальний modelType у recommendation result
content = content.replace(
  /modelType:\s*result\.modelType\s*\?\s*`[^`]*`\s*:\s*'[^']*'/g,
  "modelType: 'Гібридна рекомендаційна модель Studdy'"
);

fs.writeFileSync(path, content, "utf8");

console.log("DONE hard cleaned mojibake in appwrite.js");
console.log("Backup:", backup);
