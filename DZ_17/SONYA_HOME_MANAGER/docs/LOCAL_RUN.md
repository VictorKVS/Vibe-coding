# LOCAL_RUN · SONYA Flagship

## 1. Получить свежий код

```powershell
Set-Location -LiteralPath "G:\1\Vibe coding\Vibe-coding"
git status
git fetch origin
git merge origin/main --no-edit
```

Не использовать `git add .` без проверки: в репозитории есть локальные untracked-артефакты, которые не относятся к SONYA.

## 2. Перейти в flagship-приложение

```powershell
Set-Location -LiteralPath "G:\1\Vibe coding\Vibe-coding\DZ_17\SONYA_HOME_MANAGER\production_app"
```

## 3. Проверить Ollama

```powershell
ollama --version
ollama list
Invoke-RestMethod http://127.0.0.1:11434/api/tags
```

Нужна vision-модель `llava:7b` или другая совместимая модель, указанная в `SONYA_VISION_MODEL`.

Если `llava:7b` отсутствует:

```powershell
ollama pull llava:7b
```

## 4. Установить Node dependencies

```powershell
npm install
```

## 5. Запустить frontend + local API

```powershell
npm run dev
```

Открыть:

```text
http://localhost:5173
```

Проверка API:

```powershell
Invoke-RestMethod http://127.0.0.1:8787/api/_healthcheck
```

## 6. Запуск по отдельности

API:

```powershell
npm run dev:api
```

Frontend:

```powershell
npm run dev:web
```

## 7. Смена модели

```powershell
$env:SONYA_VISION_MODEL="llava:7b"
npm run dev
```

## 8. Если порт занят

```powershell
$env:SONYA_LOCAL_API_PORT="8788"
npm run dev:api
```

При изменении API-порта нужно также изменить target в `vite.config.ts`.

## 9. Что проверять после запуска

1. Открывается flagship dashboard.
2. Плывёт `SONYA://LIVE` terminal ticker.
3. Шестерёнка открывает Design Admin.
4. Меняются tone / glow / glass / motion.
5. Hero автоматически переключается.
6. Загружается JPG/PNG/WEBP.
7. `Хочу такое` отправляет image + text в Ollama.
8. `Что у меня есть` работает с фото холодильника.
9. Появляется `SONYA Local · llava:7b` и latency.
10. Работают «Озвучить ответ» и «Режим готовки».
