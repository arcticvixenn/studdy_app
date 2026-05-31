const fs = require("fs");
const path = require("path");

const root = process.cwd();

const targetDirs = [
  "app",
  "components",
  "constants",
  "context",
  "hooks",
  "lib",
];

const targetExts = new Set([".js", ".jsx", ".ts", ".tsx"]);

const mojibakeMarkers = [
  "Р’", "Р“", "Р”", "Р•", "Р–", "Р—", "Р™", "Рљ", "Р›", "Рњ", "Рќ", "Рћ",
  "Рџ", "Р°", "Р±", "РІ", "Рі", "Рґ", "Рµ", "Р¶", "Р·", "Рё", "Р№",
  "Рє", "Р»", "Рј", "РЅ", "Рѕ", "Рї", "СЂ", "СЃ", "С‚", "Сѓ", "С„",
  "С…", "С†", "С‡", "С€", "С‰", "СЊ", "С‹", "СЋ", "СЏ",
  "С–", "С—", "С”", "Р„", "Р†", "Р‡", "Т‘",
  "вЂ", "в„", "рџ", "в™", "тА", "╬"
];

const looksMojibake = (text) => {
  return mojibakeMarkers.some((marker) => text.includes(marker));
};

const badScore = (text) => {
  let score = 0;

  for (const marker of mojibakeMarkers) {
    if (text.includes(marker)) score += 5;
  }

  score += (text.match(/[�]/g) || []).length * 10;

  return score;
};

const goodScore = (text) => {
  return (text.match(/[а-яіїєґА-ЯІЇЄҐ]/g) || []).length;
};

const tryFix = (text) => {
  if (!looksMojibake(text)) return text;

  try {
    const buffer = Buffer.from(text, "latin1");
    const decoded = buffer.toString("utf8");

    if (
      decoded &&
      decoded !== text &&
      badScore(decoded) < badScore(text) &&
      goodScore(decoded) >= goodScore(text)
    ) {
      return decoded;
    }
  } catch {}

  try {
    const buffer = Buffer.from(text, "binary");
    const decoded = buffer.toString("utf8");

    if (
      decoded &&
      decoded !== text &&
      badScore(decoded) < badScore(text) &&
      goodScore(decoded) >= goodScore(text)
    ) {
      return decoded;
    }
  } catch {}

  return text;
};

const fixFile = (filePath) => {
  let content = fs.readFileSync(filePath, "utf8");
  const original = content;

  // Фіксимо тільки рядкові літерали, щоб не ламати JS-код.
  content = content.replace(
    /(["'`])((?:\\.|(?!\1)[\s\S])*?)\1/g,
    (match, quote, body) => {
      if (!looksMojibake(body)) return match;

      // Не чіпаємо template literals з JS-вставками.
      if (quote === "`" && body.includes("${")) return match;

      const fixed = tryFix(body);

      if (fixed === body) return match;

      return `${quote}${fixed}${quote}`;
    }
  );

  if (content !== original) {
    const backup = `${filePath}.bak.mojibake_${Date.now()}`;
    fs.copyFileSync(filePath, backup);
    fs.writeFileSync(filePath, content, "utf8");
    console.log("FIXED:", filePath);
  }
};

const walk = (dir) => {
  if (!fs.existsSync(dir)) return;

  for (const item of fs.readdirSync(dir)) {
    const full = path.join(dir, item);
    const stat = fs.statSync(full);

    if (stat.isDirectory()) {
      walk(full);
      continue;
    }

    if (targetExts.has(path.extname(full))) {
      fixFile(full);
    }
  }
};

for (const dir of targetDirs) {
  walk(path.join(root, dir));
}

console.log("DONE mojibake string literal fix");
