const fs = require("fs");

const path = "lib/appwrite.js";
let content = fs.readFileSync(path, "utf8");

const backup = `${path}.bak.fix_stray_arrows_${Date.now()}`;
fs.copyFileSync(path, backup);

function removeStrayArrowAfter(marker, signatureText) {
  const markerStart = content.indexOf(marker);

  if (markerStart === -1) {
    console.log("Marker not found:", marker);
    return;
  }

  const sub = content.slice(markerStart);
  const strayRegex = new RegExp("\\r?\\n\\s*=>\\s*\\{\\s*\\r?\\n\\s*" + signatureText);

  const match = sub.match(strayRegex);

  if (!match) {
    console.log("No stray tail after:", marker);
    return;
  }

  const strayStart = markerStart + match.index;
  const nextExportRegex = /\r?\nexport const [A-Za-z0-9_]+ =/g;
  nextExportRegex.lastIndex = strayStart + 5;

  const nextExport = nextExportRegex.exec(content);

  if (!nextExport) {
    console.log("Could not find next export after broken tail.");
    console.log(content.slice(strayStart, strayStart + 1200));
    throw new Error("Cannot safely remove stray arrow");
  }

  const nextExportStart = nextExport.index + 1;

  content = content.slice(0, strayStart) + "\n\n" + content.slice(nextExportStart);

  console.log("Removed stray tail after:", marker);
}

removeStrayArrowAfter(
  "export const submitQuizAttempt = async ({",
  "if\\s*\\(!user\\?\\.\\$id"
);

removeStrayArrowAfter(
  "export const awardQuizXp = async ({",
  "const score = Math\\.max"
);

fs.writeFileSync(path, content, "utf8");

console.log("DONE fixed stray arrows");
console.log("Backup:", backup);
