const fs = require("fs");

const path = "lib/appwrite.js";
let content = fs.readFileSync(path, "utf8");

const backup = `${path}.bak.remove_all_orphan_arrows_${Date.now()}`;
fs.copyFileSync(path, backup);

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

      if (source[end] === ";") {
        end += 1;
      }

      break;
    }
  }

  if (end === -1) {
    throw new Error("Could not find end of orphan arrow block");
  }

  console.log("Removed orphan arrow block:");
  console.log(source.slice(start, Math.min(end, start + 250)));

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

  if (removedCount > 20) {
    throw new Error("Too many orphan arrow blocks. Stopping.");
  }
}

fs.writeFileSync(path, content, "utf8");

console.log("DONE removed orphan arrow blocks:", removedCount);
console.log("Backup:", backup);
