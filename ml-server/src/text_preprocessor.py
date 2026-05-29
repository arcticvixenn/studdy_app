import re
from typing import List


UK_STOPWORDS = {
    "і", "й", "та", "або", "але", "що", "це", "як", "для", "на", "у", "в", "до",
    "з", "із", "за", "про", "при", "від", "над", "під", "між", "через",
    "є", "бути", "було", "були", "може", "можуть", "має", "мають",
    "який", "яка", "яке", "які", "також", "тому", "наприклад",
    "the", "a", "an", "and", "or", "but", "is", "are", "to", "of", "in", "on", "for",
}


def clean_text(text: str) -> str:
    if not text:
        return ""

    text = text.replace("\n", " ")
    text = re.sub(r"\s+", " ", text)
    text = text.strip()

    return text


def split_sentences(text: str) -> List[str]:
    text = clean_text(text)

    raw_sentences = re.split(r"(?<=[.!?])\s+", text)
    sentences = []

    for sentence in raw_sentences:
        sentence = sentence.strip()
        words = sentence.split()

        if len(words) >= 6:
            sentences.append(sentence)

    return sentences


def tokenize(text: str) -> List[str]:
    text = text.lower()
    tokens = re.findall(r"[a-zA-Zа-яА-ЯіїєґІЇЄҐ0-9\-]+", text)

    return [
        token
        for token in tokens
        if len(token) > 2 and token not in UK_STOPWORDS
    ]


def normalize_for_ml(text: str) -> str:
    return " ".join(tokenize(text))
