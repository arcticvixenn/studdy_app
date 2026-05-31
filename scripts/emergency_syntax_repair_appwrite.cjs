const fs = require("fs");
const { spawnSync } = require("child_process");

const path = "lib/appwrite.js";
let content = fs.readFileSync(path, "utf8");

const backup = `${path}.bak.emergency_syntax_repair_${Date.now()}`;
fs.copyFileSync(path, backup);

// Фіксить зламані порожні рядки після попередніх автозамін:
// || ',  -> || '',
// : ',   -> : '',
// ?? ',  -> ?? '',
content = content
  .replace(/\|\|\s*',/g, "|| '',")
  .replace(/\?\?\s*',/g, "?? '',")
  .replace(/:\s*',/g, ": '',")
  .replace(/=\s*',/g, "= '',");

// Фіксить випадки типу: ''текст'' -> 'текст'
content = content.replace(/''([^'\r\n]+)''/g, "'$1'");

// Прибирає сирітські хвости виду окремого => { ... };
function removeOneOrphanArrow(source) {
  const match = /\n\s*=>\s*\{/.exec(source);

  if (!match) {
    return { source, removed: false };
  }

  const start = match.index;
  const braceStart = source.indexOf("{", start);

  let depth = 0;
  let end = -1;

  for (let i = braceStart; i < source.length; i++) {
    if (source[i] === "{") depth++;
    if (source[i] === "}") depth--;

    if (depth === 0) {
      end = i + 1;
      while (end < source.length && /\s/.test(source[end])) end++;
      if (source[end] === ";") end += 1;
      break;
    }
  }

  if (end === -1) return { source, removed: false };

  console.log("Removed orphan arrow block near:");
  console.log(source.slice(start, Math.min(start + 160, end)));

  return {
    source: source.slice(0, start) + "\n\n" + source.slice(end),
    removed: true,
  };
}

let removedCount = 0;

while (true) {
  const result = removeOneOrphanArrow(content);
  content = result.source;

  if (!result.removed) break;

  removedCount += 1;
  if (removedCount > 20) break;
}

fs.writeFileSync(path, content, "utf8");

console.log("Backup:", backup);
console.log("Removed orphan arrows:", removedCount);

const check = spawnSync(process.execPath, ["--check", path], {
  encoding: "utf8",
});

if (check.status === 0) {
  console.log("SYNTAX OK");
} else {
  console.log("SYNTAX ERROR:");
  console.log(check.stderr || check.stdout);
  process.exit(1);
}
