"""Writes the sounds (phonemes) of each voice line, for lip-sync. Called by make-video.js; you don't run it yourself.

Usage: python tools/phonemes.py <lines.json> <out.json>
lines.json: [{"text": "...", "lang": "en-us"}, ...]; out.json gets the phonemes in the same order.
"""
import json, sys
from kokoro_onnx.tokenizer import Tokenizer
from sound_words import speech_phonemes

lines = json.load(open(sys.argv[1], encoding="utf-8"))
tk = Tokenizer()
json.dump([speech_phonemes(l["text"], l["lang"], tk.phonemize) or tk.phonemize(l["text"], l["lang"]) for l in lines], open(sys.argv[2], "w", encoding="utf-8"), ensure_ascii=False)
