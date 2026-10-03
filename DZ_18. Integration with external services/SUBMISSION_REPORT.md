# DZ-18 — Integration with external services

## FATHER Content Generator

### 1. Цель работы

Создать самостоятельное приложение для генерации медиаконтента с внешними API-интеграциями, собственными системными промптами, отдельными режимами работы и дополнительным пользовательским модулем.

### 2. Реализованное решение

Разработан **FATHER Content Generator** со следующими разделами:

- Рассылки;
- Подкасты;
- Видео-аватар;
- Comic / Storyboard;
- Диагностика.

### 3. Архитектурное решение

ALINA Analyst и Content Generator разведены как отдельные bounded contexts.

```text
ALINA Analyst
      |
      | verified ResearchPacket
      v
shared/contracts
      |
      | ContentBrief
      v
FATHER Content Generator
      |
      +-- Newsletter
      +-- Podcast
      +-- Video Avatar
      +-- Persona / Scene / Storyboard
```

Генератор не должен самостоятельно изменять проверенную фактическую основу. Для возврата материала в исследовательский контур предусмотрены статусы:

- NEED_RESEARCH;
- CONFLICT_FOUND;
- MISSING_FACT;
- SOURCE_REQUIRED.

### 4. Внешние сервисы

#### OpenAI Responses API

Используется для structured generation:

- Newsletter;
- Podcast.

Системные промпты хранятся отдельно и версионируются:

```text
father.newsletter@1.0.0
father.podcast@1.0.0
```

Ответы валидируются как structured JSON.

#### OpenAI Text-to-Speech

Podcast script может быть преобразован в MP3.

Используется отдельный server-side endpoint.

В UI явно указывается, что голос является AI-generated.

#### HeyGen v3

Реализовано:

- получение avatars;
- получение voices;
- выбор avatar;
- выбор voice;
- выбор landscape / portrait;
- передача script;
- создание Video Agent session;
- polling session;
- polling final video;
- отображение MP4.

API key хранится только на сервере.

### 5. Persona / Scene Engine

В дополнительной вкладке Comic / Storyboard реализован общий движок персонажей.

Reference personas:

- F-01;
- M-01.

Поддерживаются:

- age preset;
- emotion;
- environment;
- pose;
- action;
- wardrobe;
- props;
- dialogue;
- camera;
- частичная регенерация сцены.

F-01 и M-01 используют один engine path.

### 6. Безопасность

Реализованы:

- server-side API secrets;
- `.env` исключён из Git;
- provider payload изолирован adapter layer;
- browser работает только с `/api/*`;
- ограничение request body;
- provider timeout;
- normalized errors;
- bounded HeyGen polling;
- API keys не выводятся в health UI;
- Docker context исключает secrets.

### 7. Тестирование

Provider layer проверен в Node 22:

```text
tests: 8
passed: 8
failed: 0
```

Проверены:

- отсутствие утечки API keys;
- HeyGen avatars normalization;
- HeyGen voices normalization;
- HeyGen Video Agent request;
- HeyGen completed video polling;
- OpenAI structured response contract;
- `store:false`;
- OpenAI TTS request.

Полный локальный gate:

```powershell
.\CHECK_DZ18.cmd
```

### 8. Запуск

```powershell
.\START_DZ18.cmd
```

Web:

```text
http://localhost:5188
```

API:

```text
http://localhost:5190/api/health
```

### 9. Deployment

Подготовлен production Docker image.

```powershell
docker build -t father-dz18 .
docker run --rm -p 5190:5190 --env-file .env father-dz18
```

### 10. Доказательства

Список необходимых снимков экрана и acceptance evidence находится в:

```text
EVIDENCE_MATRIX.md
```

Сценарий демонстрации:

```text
DEMO_SCRIPT.md
```

Результаты автоматизированных provider tests:

```text
TEST_REPORT.md
```

### 11. Статус

Реализация submission baseline завершена на уровне кода.

Перед финальной сдачей необходимо:

1. выполнить локальный `CHECK_DZ18.cmd`;
2. проверить реальные OpenAI/HeyGen keys;
3. получить один completed HeyGen video;
4. сделать screenshots;
5. проверить production secrets;
6. зафиксировать финальный real-key smoke test.


### 12. Published URL

https://father-content-generator-dz-18-5urk89.v2.appdeploy.ai/

Deployment status: ready. Автоматическая QA-проверка AppDeploy завершилась без frontend, backend и network errors.
