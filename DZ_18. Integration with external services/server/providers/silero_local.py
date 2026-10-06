import argparse
from pathlib import Path

import soundfile as sf
import torch
from silero import silero_tts


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--speaker", required=True)
    parser.add_argument("--input-file", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    allowed = {"xenia", "eugene"}

    if args.speaker not in allowed:
        raise SystemExit("Unsupported local voice")

    text = Path(args.input_file).read_text(
        encoding="utf-8"
    ).strip()

    if not text:
        raise SystemExit("Text is required")

    if len(text) > 12000:
        raise SystemExit("Text is too long")

    torch.set_num_threads(4)

    model, _ = silero_tts(
        language="ru",
        speaker="v5_ru",
    )

    model.to(torch.device("cpu"))

    sample_rate = 48000

    audio = model.apply_tts(
        text=text,
        speaker=args.speaker,
        sample_rate=sample_rate,
    )

    target = Path(args.output)
    target.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    sf.write(
        target,
        audio.detach().cpu().numpy(),
        sample_rate,
        subtype="PCM_16",
    )


if __name__ == "__main__":
    main()
