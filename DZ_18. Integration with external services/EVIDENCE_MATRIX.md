# DZ-18 — Evidence Matrix

Статус доказательств:
- `CODE` — реализация есть в репозитории;
- `LOCAL` — требуется локальный smoke test;
- `SCREENSHOT` — требуется снимок экрана;
- `PUBLISH` — требуется опубликованный URL.

| Требование | Реализация | Где в коде | Доказательство |
|---|---|---|---|
| Индивидуальный web-интерфейс | FATHER Content Generator, 5 разделов | `src/app/App.tsx`, `src/styles.css` | CODE + SCREENSHOT |
| Самостоятельные system prompts | versioned registry для Newsletter и Podcast | `server/prompts/registry.mjs` | CODE |
| Рассылки | structured generation | `/api/generate/newsletter` | CODE + LOCAL + SCREENSHOT |
| Подкасты | structured script + отдельный TTS | `/api/generate/podcast`, `/api/tts/openai` | CODE + LOCAL + SCREENSHOT |
| Видео-аватар | HeyGen v3 provider | `server/providers/heygen.mjs` | CODE + LOCAL |
| Получение avatars по API | `GET /v3/avatars` через backend adapter | Video Avatar tab | CODE + SCREENSHOT |
| Получение voices по API | `GET /v3/voices` через backend adapter | Video Avatar tab | CODE + SCREENSHOT |
| Генерация avatar video | `POST /v3/video-agents` + polling | Video Avatar tab | CODE + LOCAL + SCREENSHOT |
| Дополнительная вкладка | Comic / Storyboard | Persona/Scene Engine | CODE + SCREENSHOT |
| Секреты server-side | ключи только в `.env`, browser вызывает `/api/*` | server adapters + `.gitignore` | CODE |
| Error handling | missing keys, HTTP errors, failed jobs | provider adapters + UI | CODE + LOCAL |
| Тесты | HeyGen + OpenAI/TTS boundary | `server/providers/*.test.mjs` | CODE + LOCAL |
| Production build | Vite build | `npm run build` | LOCAL |
| Публикация | production deployment | AppDeploy | https://father-content-generator-dz-18-5urk89.v2.appdeploy.ai/ |
| Итоговые screenshots | checklist ниже | — | SCREENSHOT |

## Screenshot checklist

После локального запуска сделать минимум:

1. Главный экран FATHER Content Generator.
2. Newsletter — заполненный brief + реальный structured result.
3. Podcast — generated script + MP3 player.
4. Video Avatar — реальные avatars и voices из HeyGen.
5. Video Avatar — выбранный avatar + voice + script.
6. Video Avatar — job со статусом `completed` и video preview.
7. Comic / Storyboard — F-01, 6 кадров.
8. Comic / Storyboard — M-01, 6 кадров.
9. Diagnostics — основные модули `ready`.
10. Терминал — `npm test` и `npm run build` успешно.

## Финальный gate

Перед сдачей:

```text
CHECK_DZ18.cmd
→ tests green
→ build green
→ START_DZ18.cmd
→ real OpenAI generation
→ real OpenAI TTS
→ real HeyGen avatars/voices
→ one completed HeyGen video
→ screenshots
→ deployment
→ published URL
```


## Published URL

https://father-content-generator-dz-18-5urk89.v2.appdeploy.ai/
