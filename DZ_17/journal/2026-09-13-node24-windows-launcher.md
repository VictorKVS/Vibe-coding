# 2026-09-13 — Windows Node 24 launcher incident

## TASK

Разобрать локальный сбой `npm run dev:models` на Windows и сохранить воспроизводимую причину/исправление.

## OBSERVED

Пользовательский runtime:

```text
Node.js v24.18.0
npm 11.16.0
project engines: >=22.13.0 <23
```

После предупреждения об отсутствии `runtime/llama/llama-server.exe` launcher должен был запустить ALINA без локальных моделей, но завершался:

```text
Error: spawn EINVAL
... scripts/run-with-models.mjs:65
```

Также npm сообщил о неразрешённых install scripts для:

```text
esbuild@0.27.3
sharp@0.34.5
workerd@1.20260515.1
```

## ROOT CAUSE / CLASSIFICATION

`PROJECT_DIAGNOSIS`:

- проект официально ограничен Node 22.x через `package.json` engines;
- строка падения была Windows-запуском `npm.cmd` через `child_process.spawn`;
- отсутствие `llama-server.exe` не является причиной падения: launcher специально поддерживает degraded mode без LOCAL моделей;
- на Node 24/Windows прямой spawn `npm.cmd` в данном окружении дал `EINVAL`.

## CHANGE

Commit:

```text
dab9ab26d25e92dff50abdf5add22450ec933d5f
```

Файл:

```text
DZ_17/app/scripts/run-with-models.mjs
```

Изменения:

1. Windows child process теперь запускается через `%ComSpec% /d /s /c "npm run <mode>"`, а не прямой `spawn('npm.cmd', ...)`.
2. Добавлено явное предупреждение, если major Node != 22.
3. Добавлены обработчики `error` для app/llama child processes.
4. Degraded mode без `llama-server.exe` сохранён.

## WHY

Нужно, чтобы внешний provider path (например GigaChat) работал даже до установки локального llama.cpp runtime. Ошибка запуска UI не должна маскироваться как отсутствие LOCAL модели.

## SOURCE / DECISION

Источники для этого изменения:

```text
user runtime log / 2026-09-13
DZ_17/app/package.json
DZ_17/app/scripts/run-with-models.mjs
```

Внешние ГОСТы/книги для данного технического исправления не использовались.

## VALIDATION PLAN

На пользовательской Windows-машине:

```powershell
cd "G:\1\Vibe coding\Vibe-coding"
git pull origin main
cd ".\DZ_17\app"
node -v
npm approve-scripts esbuild sharp workerd
npm rebuild esbuild sharp workerd
npm run dev:models
```

Предпочтительный runtime проекта: Node 22.x согласно `engines`.

Acceptance:

```text
- нет spawn EINVAL;
- отсутствие llama-server приводит только к warning;
- `npm run dev` реально стартует;
- /api/health и /api/llm доступны;
- Admin/IB SYS panel открывается;
```

## STATUS

```text
fix committed / local acceptance pending
```
