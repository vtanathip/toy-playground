import os
from pathlib import Path

from dotenv import load_dotenv
from moviepy import VideoFileClip

load_dotenv()

OUTPUT_DIR = Path("output")


def split_video(input_path: str):
    OUTPUT_DIR.mkdir(exist_ok=True)
    stem = Path(input_path).stem

    clip = VideoFileClip(input_path)
    half_duration = clip.duration / 2

    first_half = clip.subclipped(0, half_duration)
    second_half = clip.subclipped(half_duration, clip.duration)

    first_output = OUTPUT_DIR / f"{stem}_part1.mp4"
    second_output = OUTPUT_DIR / f"{stem}_part2.mp4"

    first_half.write_videofile(str(first_output))
    print(f"Saved part 1 (0s - {half_duration:.1f}s) to {first_output}")

    second_half.write_videofile(str(second_output))
    print(
        f"Saved part 2 ({half_duration:.1f}s - {clip.duration:.1f}s) to {second_output}")

    clip.close()
    first_half.close()
    second_half.close()


if __name__ == "__main__":
    input_file = os.getenv("INPUT_VIDEO_PATH", "input.mp4")
    split_video(input_file)
