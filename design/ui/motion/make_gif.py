"""Build a real-speed GIF from slowed-clock screenshots.

usage: make_gif.py OUT SHOT_DIR FIRST_INDEX END_WARPED TIMES_JSON
TIMES_JSON: the page clock (ms) logged just before each screenshot, in order;
screenshot i is the file ending in -{FIRST_INDEX + i}.png.
Each frame is held until the next one's time; the clip stops at END_WARPED
and the last frame is held 1.2 s so the end state can be read.
"""
import glob
import json
import os
import sys

from PIL import Image

out, shot_dir, first, end, times_json = sys.argv[1:6]
first, end = int(first), float(end)
times = json.loads(open(times_json).read())

files = {}
for path in glob.glob(os.path.join(shot_dir, "screenshot-*.png")):
    files[int(path.rsplit("-", 1)[1][:-4])] = path

frames, durations = [], []
for i, t in enumerate(times):
    if t > end:
        break
    nxt = times[i + 1] if i + 1 < len(times) else end
    frames.append(Image.open(files[first + i]).convert("RGB"))
    durations.append(max(20, round(min(nxt, end) - t)))
durations[0] = max(durations[0], 400)
durations[-1] = 1200

# One palette for the whole clip, from a strip of every frame, so colours
# that only show for a moment (the red Delete) are in it too.
strip = Image.new("RGB", (frames[0].width, frames[0].height * len(frames)))
for k, f in enumerate(frames):
    strip.paste(f, (0, k * f.height))
palette = strip.quantize(colors=255, method=Image.Quantize.MEDIANCUT)
pal = [f.quantize(palette=palette, dither=Image.Dither.NONE) for f in frames]
os.makedirs(os.path.dirname(out), exist_ok=True)
pal[0].save(out, save_all=True, append_images=pal[1:], duration=durations, loop=0, optimize=True)
print(out, len(frames), "frames,", sum(durations), "ms,", os.path.getsize(out) // 1024, "KB")
