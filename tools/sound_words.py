"""Sound-words (Hm, Shh, Hoo-hoo-hoo...) said the way config/sound-words.json says, for tts.py and phonemes.py.

speech_phonemes(text, lang, phonemize) gives the sounds for a whole line when it has a sound-word in it
(the other words are read as usual), or None when it has none, so the line is read exactly as before.
"""
import json, os, re

_cfg = json.load(open(os.path.join(os.path.dirname(__file__), "..", "config", "sound-words.json"), encoding="utf-8"))
WORDS = [(re.compile(p, re.I), ph) for p, ph in _cfg["words"]]
WORD = re.compile(r"[A-Za-z]+(?:['’-][A-Za-z]+)*")   # (I'm is one word, so its m is never a sound)


def sound_of(word):
    """The sounds for a sound-word (pieces joined with hyphens get a small break), or None for an ordinary word."""
    out = []
    for piece in word.split("-"):
        ph = next((ph for rx, ph in WORDS if rx.match(piece)), None)
        if ph is None:
            return None
        out.append(ph)
    return ", ".join(out)


def speech_phonemes(text, lang, phonemize):
    parts, plain, found, last = [], "", False, 0
    for m in WORD.finditer(text):
        ph = sound_of(m.group(0))
        if ph is None:
            continue
        plain += text[last:m.start()]
        lead = re.match(r"[\s.,!?;:…]*", plain).group(0)
        if parts and lead.strip():   # punctuation right after the last sound-word stays with it ("Hoo. Duck")
            parts[-1] += re.sub(r"\s", "", lead)
            plain = plain[len(lead):]
        if plain.strip():
            parts.append(phonemize(plain, lang).strip())
        elif plain and parts:
            parts[-1] += plain.strip()
        parts.append(ph)
        plain, found, last = "", True, m.end()
    if not found:
        return None
    rest = text[last:]
    lead = re.match(r"[\s.,!?;:…]*", rest).group(0)
    parts[-1] += re.sub(r"\s", "", lead)
    rest = rest[len(lead):]
    if re.search(r"[A-Za-z0-9]", rest):
        parts.append(phonemize(rest, lang).strip())
    else:
        parts[-1] += re.sub(r"[^.,!?;:…]", "", rest)
    return " ".join(p for p in parts if p)
