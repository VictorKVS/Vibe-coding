import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import {
  readFile,
  unlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_MODEL = "v5_ru";
const ALLOWED_VOICES = new Set([
  "xenia",
  "eugene",
]);

const workerPath = fileURLToPath(
  new URL(
    "./silero_local.py",
    import.meta.url,
  )
);

export async function sileroHealth() {
  const python = String(
    process.env.SILERO_PYTHON || ""
  ).trim();

  return {
    provider: "silero",
    configured: Boolean(
      python && existsSync(python)
    ),
    model:
      process.env.SILERO_MODEL ||
      DEFAULT_MODEL,
    voices: [
      {
        id: "xenia",
        name: "ALINA",
        gender: "female",
        language: "ru",
      },
      {
        id: "eugene",
        name: "FATHER",
        gender: "male",
        language: "ru",
      },
    ],
  };
}

export async function synthesizeLocalSpeech({
  input,
  voice = "xenia",
}) {
  const python = String(
    process.env.SILERO_PYTHON || ""
  ).trim();

  if (!python || !existsSync(python)) {
    const error = new Error(
      "Local Silero Python runtime is not configured."
    );
    error.statusCode = 503;
    error.provider = "silero";
    throw error;
  }

  if (
    typeof input !== "string" ||
    input.trim().length === 0
  ) {
    const error = new Error(
      "TTS input is required."
    );
    error.statusCode = 400;
    throw error;
  }

  if (input.length > 12000) {
    const error = new Error(
      "TTS input is too long."
    );
    error.statusCode = 400;
    throw error;
  }

  if (!ALLOWED_VOICES.has(voice)) {
    const error = new Error(
      "Unsupported local TTS voice."
    );
    error.statusCode = 400;
    throw error;
  }

  const token =
    `${process.pid}-${Date.now()}`;

  const textFile = join(
    tmpdir(),
    `father-silero-${token}.txt`
  );

  const outputFile = join(
    tmpdir(),
    `father-silero-${token}.wav`
  );

  try {
    await writeFile(
      textFile,
      input.trim(),
      {
        encoding: "utf8",
      }
    );

    await runPython({
      python,
      textFile,
      outputFile,
      voice,
    });

    const audio =
      await readFile(outputFile);

    return {
      provider: "silero",
      model:
        process.env.SILERO_MODEL ||
        DEFAULT_MODEL,
      voice,
      contentType: "audio/wav",
      audio,
    };
  }
  finally {
    await unlink(textFile)
      .catch(() => {});

    await unlink(outputFile)
      .catch(() => {});
  }
}

function runPython({
  python,
  textFile,
  outputFile,
  voice,
}) {
  return new Promise(
    (resolve, reject) => {

      execFile(
        python,
        [
          workerPath,
          "--speaker",
          voice,
          "--input-file",
          textFile,
          "--output",
          outputFile,
        ],
        {
          timeout: 180000,
          windowsHide: true,
          maxBuffer:
            8 * 1024 * 1024,
          env: {
            ...process.env,
            PYTHONUTF8: "1",
            PYTHONIOENCODING:
              "utf-8",
          },
        },
        (
          error,
          stdout,
          stderr
        ) => {

          if (error) {
            const detail = String(
              stderr ||
              stdout ||
              error.message
            ).trim();

            const wrapped =
              new Error(
                detail ||
                "Local Silero TTS failed."
              );

            wrapped.statusCode = 500;
            wrapped.provider =
              "silero";

            reject(wrapped);
            return;
          }

          resolve();
        }
      );
    }
  );
}
