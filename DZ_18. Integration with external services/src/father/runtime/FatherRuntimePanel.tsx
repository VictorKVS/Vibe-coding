import { useEffect, useRef, useState } from "react";

import {
  fatherChat,
  fatherGenerateImage,
  fatherSpeak,
  fatherTranscribe,
  getFatherHealth,
  getFatherZoo,
  type FatherHealth,
} from "./client";

type ZooState = {
  ollama: string[];
  comfyui: string[];
};

export function FatherRuntimePanel() {
  const [health, setHealth] = useState<FatherHealth | null>(null);
  const [zoo, setZoo] = useState<ZooState>({ ollama: [], comfyui: [] });

  const [message, setMessage] = useState(
    "Алина, расскажи состояние FATHER Runtime."
  );

  const [answer, setAnswer] = useState("");
  const [imagePrompt, setImagePrompt] = useState(
    "FATHER AI engineering control center, cinematic technical interface"
  );

  const [imageUrl, setImageUrl] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [recording, setRecording] = useState(false);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  async function refresh() {
    try {
      const [healthData, zooData] = await Promise.all([
        getFatherHealth(),
        getFatherZoo(),
      ]);

      setHealth(healthData);
      setZoo(zooData);
      setError("");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "FATHER Runtime unavailable"
      );
    }
  }

  useEffect(() => {
    void refresh();

    const timer = window.setInterval(
      () => void refresh(),
      10000
    );

    return () => {
      window.clearInterval(timer);
      streamRef.current
        ?.getTracks()
        .forEach((track) => track.stop());
    };
  }, []);

  async function sendMessage() {
    if (!message.trim()) return;

    setBusy("chat");
    setError("");

    try {
      const result = await fatherChat(message);
      setAnswer(result.answer);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Chat failed");
    } finally {
      setBusy("");
    }
  }

  async function speak() {
    if (!answer.trim()) return;

    setBusy("tts");

    try {
      const result = await fatherSpeak(answer);
      setAudioUrl(result.url);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "TTS failed");
    } finally {
      setBusy("");
    }
  }

  async function generateImage() {
    setBusy("image");

    try {
      const result = await fatherGenerateImage(
        imagePrompt,
        768,
        768
      );

      setImageUrl(result.url);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Image generation failed"
      );
    } finally {
      setBusy("");
    }
  }

  async function startRecording() {
    try {
      const stream =
        await navigator.mediaDevices.getUserMedia({
          audio: true,
        });

      streamRef.current = stream;
      chunksRef.current = [];

      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        setBusy("stt");

        try {
          const blob = new Blob(
            chunksRef.current,
            {
              type: recorder.mimeType || "audio/webm",
            }
          );

          const result = await fatherTranscribe(blob);

          setMessage(result.text);
        } catch (caught) {
          setError(
            caught instanceof Error
              ? caught.message
              : "STT failed"
          );
        } finally {
          setBusy("");
        }

        stream
          .getTracks()
          .forEach((track) => track.stop());
      };

      recorder.start();
      setRecording(true);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Microphone unavailable"
      );
    }
  }

  function stopRecording() {
    recorderRef.current?.stop();
    setRecording(false);
  }

  const services: Array<
    [string, string | undefined, string | undefined]
  > = [
    ["LLM", health?.services.llm.status, health?.services.llm.model],
    ["VOICE IN", health?.services.stt.status, health?.services.stt.model],
    ["VOICE OUT", health?.services.tts.status, health?.services.tts.provider],
    ["IMAGE", health?.services.image.status, health?.services.image.checkpoint],
  ];

  return (
    <section className="father-runtime">
      <div className="card father-runtime-head">
        <div>
          <p className="eyebrow">ALINA STUDIO ? FATHER CORE</p>
          <h2>ALINA Multimodal Workspace</h2>
          <p>Model Zoo · Voice Zoo · Image Zoo · ALINA</p>
        </div>

        <button className="primary" onClick={() => void refresh()}>
          Обновить
        </button>
      </div>

      {error && (
        <div className="provider-state warning">
          <strong>FATHER</strong>
          <span>{error}</span>
        </div>
      )}

      <div className="father-runtime-status">
        {services.map(([name, status, detail]) => (
          <article className="card father-service" key={name}>
            <span
              className={
                status === "ready"
                  ? "father-led ready"
                  : "father-led stopped"
              }
            />
            <div>
              <small>{name}</small>
              <strong>
                {(status ?? "checking").toUpperCase()}
              </strong>
              <span>{detail}</span>
            </div>
          </article>
        ))}
      </div>

      <div className="father-runtime-workspace">
        <section className="card">
          <h2>Алина</h2>

          <textarea
            rows={5}
            value={message}
            onChange={(event) =>
              setMessage(event.target.value)
            }
          />

          <div className="father-actions">
            <button
              className="primary"
              disabled={busy === "chat"}
              onClick={() => void sendMessage()}
            >
              {busy === "chat" ? "Думаю..." : "Отправить"}
            </button>

            {!recording ? (
              <button
                onClick={() => void startRecording()}
              >
                🎤 Говорить
              </button>
            ) : (
              <button onClick={stopRecording}>
                ■ Стоп
              </button>
            )}
          </div>

          {answer && (
            <div className="father-answer">
              <strong>ALINA</strong>
              <p>{answer}</p>

              <button
                disabled={busy === "tts"}
                onClick={() => void speak()}
              >
                🔊 Озвучить
              </button>
            </div>
          )}

          {audioUrl && (
            <audio
              src={audioUrl}
              controls
              autoPlay
            />
          )}
        </section>

        <section className="card">
          <h2>Image Zoo</h2>

          <textarea
            rows={5}
            value={imagePrompt}
            onChange={(event) =>
              setImagePrompt(event.target.value)
            }
          />

          <button
            className="primary"
            disabled={busy === "image"}
            onClick={() => void generateImage()}
          >
            {busy === "image"
              ? "Генерация..."
              : "Создать изображение"}
          </button>

          {imageUrl && (
            <img
              className="father-image-result"
              src={imageUrl}
              alt="FATHER generated"
            />
          )}
        </section>
      </div>

      <section className="card">
        <h2>Model Zoo</h2>

        <div className="father-zoo-list">
          <div>
            <strong>Ollama · {zoo.ollama.length}</strong>
            {zoo.ollama.map((model) => (
              <span key={model}>{model}</span>
            ))}
          </div>

          <div>
            <strong>ComfyUI · {zoo.comfyui.length}</strong>
            {zoo.comfyui.map((model) => (
              <span key={model}>{model}</span>
            ))}
          </div>
        </div>
      </section>
    </section>
  );
}
