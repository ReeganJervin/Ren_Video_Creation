"""Creates voice clips with Kokoro (offline). Called by make-video.js; you don't run it yourself.

Usage: python tools/tts.py <models-folder> <jobs.json>
jobs.json: [{"text": "...", "voice": "af_heart", "speed": 0.92, "out": "path.wav"}, ...]
"""
import json, os, sys
import soundfile as sf
from kokoro_onnx import Kokoro

models, jobs_path = sys.argv[1], sys.argv[2]
k = Kokoro(os.path.join(models, "kokoro.onnx"), os.path.join(models, "voices.bin"))
jobs = json.load(open(jobs_path, encoding="utf-8"))
for i, job in enumerate(jobs, 1):
    samples, sr = k.create(job["text"], voice=job["voice"], speed=job["speed"], lang="en-us")
    sf.write(job["out"], samples, sr)
    print(f"  voice {i}/{len(jobs)}: {job['text'][:60]}", flush=True)
