"""Local fallback for WAV, MP3 and Telegram OGG/Opus; no network or content logs."""
import sys
from pathlib import Path
import numpy as np
import soundfile as sf

source, target = map(Path, sys.argv[1:3])
metadata = sf.info(source)
if not 0 < metadata.duration <= 600 or not 1 <= metadata.channels <= 8:
    raise ValueError('Audio must be 0–600 seconds with at most 8 channels')
samples, rate = sf.read(source, dtype='float32', always_2d=True)
mono = samples.mean(axis=1)
resampled = np.interp(np.arange(round(len(mono) * 16000 / rate)) * rate / 16000,
                      np.arange(len(mono)), mono)
target.write_bytes((np.clip(resampled, -1, 1) * 32767).astype('<i2').tobytes())
