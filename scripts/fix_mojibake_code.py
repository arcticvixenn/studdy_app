import os
import re
from pathlib import Path

ROOT = Path(".")
DIRS = ["app", "components", "lib", "constants", "context", "hooks"]
EXTS = {".js", ".jsx", ".ts", ".tsx"}

MARKERS = [
    "Р’", "РЎ", "Рџ", "РЋ", "Р В", "РЎ", "С–", "С—", "С”",
    "вЂ", "в„", "рџ", "в™", "тА", "╬"
]

def looks_bad(text):
    return any(m in text for m in MARKERS)

def bad_score(text):
    return sum(text.count(m) for m in MARKERS) + text.count("�") * 10

def fix_text(text):
    if not looks_bad(text):
        return text

    try:
        decoded = text.encode("cp1251").decode("utf-8")
        if bad_score(decoded) < bad_score(text):
            return decoded
    except Exception:
        pass

    return text

STRING_RE = re.compile(r"""(['"`])((?:\\.|(?!\1).)*?)\1""", re.DOTALL)

def fix_file(path):
    original = path.read_text(encoding="utf-8")
    content = original

    def repl(match):
        quote = match.group(1)
        body = match.group(2)

        if quote == "`" and "${" in body:
            return match.group(0)

        fixed = fix_text(body)

        if fixed == body:
            return match.group(0)

        return f"{quote}{fixed}{quote}"

    content = STRING_RE.sub(repl, content)

    if content != original:
        backup = path.with_name(path.name + ".bak.fix_mojibake")
        backup.write_text(original, encoding="utf-8")
        path.write_text(content, encoding="utf-8")
        print("FIXED CODE", path)

def main():
    for d in DIRS:
        root = ROOT / d
        if not root.exists():
            continue

        for path in root.rglob("*"):
            if path.suffix in EXTS:
                fix_file(path)

    print("DONE CODE MOJIBAKE FIX")

if __name__ == "__main__":
    main()
