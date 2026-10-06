"""Extract evenly-spaced frames from the reference clip for review."""
import os
import subprocess
import sys

import imageio_ffmpeg

FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
VIDEO = r"C:\Users\CJN_assadawut17\Desktop\การบันทึก 2026-10-02 000841.mp4"
OUT = r"J:\โปรเจคอะตอม\data\clip_frames"


def probe_duration(path: str) -> float:
    """Return duration in seconds using ffmpeg stderr parsing."""
    proc = subprocess.run(
        [FFMPEG, "-i", path], capture_output=True, text=True, encoding="utf-8", errors="replace"
    )
    for line in proc.stderr.splitlines():
        if "Duration:" in line:
            stamp = line.split("Duration:")[1].split(",")[0].strip()
            h, m, s = stamp.split(":")
            return int(h) * 3600 + int(m) * 60 + float(s)
    raise SystemExit("could not read duration")


def main() -> None:
    count = int(sys.argv[1]) if len(sys.argv) > 1 else 24
    os.makedirs(OUT, exist_ok=True)
    total = probe_duration(VIDEO)
    print(f"duration={total:.2f}s frames={count}")

    step = total / count
    for i in range(count):
        ts = min(max(step * (i + 0.5), 0.0), max(total - 0.2, 0.0))
        dst = os.path.join(OUT, f"frame_{i:03d}.jpg")
        subprocess.run(
            [
                FFMPEG, "-y", "-ss", f"{ts:.2f}", "-i", VIDEO,
                "-frames:v", "1", "-vf", "scale=960:-2", "-q:v", "3", dst,
            ],
            capture_output=True,
        )
        print(f"{i:03d} t={ts:6.2f}s -> {dst}")


if __name__ == "__main__":
    main()
