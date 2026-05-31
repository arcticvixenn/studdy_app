const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const root = process.cwd();
const libDir = path.join(root, "lib");
const scriptsDir = path.join(root, "scripts");
const current = path.join(libDir, "appwrite.js");

const brokenBackup = path.join(
  libDir,
  `appwrite.js.BROKEN_NOW_${Date.now()}.js`
);

fs.copyFileSync(current, brokenBackup);
console.log("Saved current broken file:", brokenBackup);

const backups = fs
  .readdirSync(libDir)
  .filter((name) => name.startsWith("appwrite.js.bak"))
  .map((name) => {
    const full = path.join(libDir, name);
    return {
      name,
      full,
      mtimeMs: fs.statSync(full).mtimeMs,
    };
  })
  .sort((a, b) => b.mtimeMs - a.mtimeMs);

if (!backups.length) {
  console.log("NO BACKUPS FOUND");
  process.exit(2);
}

const tmp = path.join(scriptsDir, "__check_appwrite_backup_tmp.js");

for (const backup of backups) {
  fs.copyFileSync(backup.full, tmp);

  const result = spawnSync(process.execPath, ["--check", tmp], {
    encoding: "utf8",
  });

  const output = `${result.stdout || ""}\n${result.stderr || ""}`;

  if (result.status === 0 && !output.includes("SyntaxError")) {
    fs.copyFileSync(backup.full, current);
    fs.unlinkSync(tmp);

    console.log("RESTORED VALID BACKUP:");
    console.log(backup.name);
    console.log("Now run: node --check .\\lib\\appwrite.js");
    process.exit(0);
  }

  console.log("BAD BACKUP:", backup.name);
  const firstLine = output.split(/\r?\n/).find(Boolean);
  if (firstLine) console.log(firstLine);
}

if (fs.existsSync(tmp)) fs.unlinkSync(tmp);

console.log("NO VALID BACKUP FOUND");
console.log("Use git restore only as last option.");
process.exit(3);
