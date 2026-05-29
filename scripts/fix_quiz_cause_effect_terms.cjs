const fs = require("fs");

const path = "ml-server/src/question_generator.py";
let content = fs.readFileSync(path, "utf8");

const backup = `${path}.bak.fix_consequence_${Date.now()}`;
fs.copyFileSync(path, backup);

const startMarker = "    def try_cause_effect_pattern(self, sentence: str) -> Optional[Dict]:";
const endMarker = "    def try_purpose_pattern(self, sentence: str) -> Optional[Dict]:";

const start = content.indexOf(startMarker);
const end = content.indexOf(endMarker);

if (start === -1 || end === -1 || end <= start) {
  throw new Error("Cannot find try_cause_effect_pattern block");
}

const newBlock = `    def try_cause_effect_pattern(self, sentence: str) -> Optional[Dict]:
        s = self.clean_text(sentence)

        direct_patterns = [
            (r"^(.+?)\\\\s+формується\\\\s+під\\\\s+впливом\\\\s+(.+?)\\\\.?$", "Під впливом чого формується поняття «{term}»?"),
            (r"^(.+?)\\\\s+спричиняє\\\\s+(.+?)\\\\.?$", "Що спричиняє поняття «{term}»?"),
            (r"^(.+?)\\\\s+призводить до\\\\s+(.+?)\\\\.?$", "До чого призводить поняття «{term}»?"),
        ]

        for pattern, question_template in direct_patterns:
            match = re.match(pattern, s, flags=re.IGNORECASE)

            if not match:
                continue

            term = self.clean_text(match.group(1))
            answer = self.clean_text(match.group(2))

            if not self.is_good_term_answer(term):
                continue

            return self.make_result(
                question_text=question_template.format(term=term),
                answer=answer,
                answer_type="long",
                term=term,
            )

        match = re.match(
            r"^Причиною\\\\s+(.+?)\\\\s+.*?стає\\\\s+(.+?)\\\\.?$",
            s,
            flags=re.IGNORECASE,
        )

        if match:
            term = self.clean_text(match.group(1))
            answer = self.clean_text(match.group(2))

            return self.make_result(
                question_text=f"Що часто є причиною {term}?",
                answer=answer,
                answer_type="long",
                term=term,
            )

        match = re.match(
            r"^Наслідком\\\\s+(.+?)\\\\s+може\\\\s+бути\\\\s+(.+?)\\\\.?$",
            s,
            flags=re.IGNORECASE,
        )

        if match:
            term = self.clean_text(match.group(1))
            answer = self.clean_text(match.group(2))

            return self.make_result(
                question_text=f"Що може бути наслідком {term}?",
                answer=answer,
                answer_type="long",
                term=term,
            )

        return None

`;

content = content.slice(0, start) + newBlock + content.slice(end);

fs.writeFileSync(path, content, "utf8");

console.log("Fixed consequence/cause question generation.");
console.log("Backup:", backup);
