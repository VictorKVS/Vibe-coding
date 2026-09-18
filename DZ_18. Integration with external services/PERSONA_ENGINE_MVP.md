# DZ-18 — Persona Engine MVP

Status: `PRIMARY MVP / ENGINE FIRST`

## 1. Главная цель

В MVP главным продуктом является **движок персонажей**, а не набор отдельных медиа-вкладок.

ДЗ-18 используется как демонстрационная оболочка, которая показывает работу движка через:
- Comic / Storyboard;
- Video Avatar integration;
- Podcast voice;
- media preview.

Архитектурный приоритет:

PERSONA ENGINE → SCENE ENGINE → EMOTION / AGE / WARDROBE / CONTEXT → MEDIA PROVIDER ADAPTERS → COMIC / AVATAR / PODCAST / CONTENT UI

## 2. Два обязательных эталонных направления

### F-01 — Female Reference Persona
- взрослый женский визуальный профиль;
- стабильная идентичность между сценами;
- набор эмоций;
- смена одежды/фона/позы;
- voice profile;
- comic/storyboard demo.

### M-01 — Male Reference Persona
- взрослый мужской визуальный профиль;
- стабильная идентичность между сценами;
- тот же контракт движка;
- собственный voice profile;
- comic/storyboard demo.

Важно: это не два разных движка. Оба персонажа обязаны использовать один и тот же Persona/Scene Engine.

## 3. Возраст — параметр движка

Возраст не кодируется отдельной логикой на каждый персонаж.

AgePreset:
- child_6_9
- child_10_12
- teen_13_17
- young_adult_18_29
- adult_30_49
- mature_50_64
- senior_65_plus

MVP acceptance:
- adult female — обязательно;
- adult male — обязательно;
- минимум один child/teen preset — желательно как proof of architecture;
- остальные возрастные профили могут быть data-only presets без полного visual polish.

## 4. PersonaSpec

Минимальные поля:
- id, name;
- presentation: female | male;
- agePreset;
- identityAnchor: faceDescription, hair, bodyBuild, distinctiveFeatures, negativeIdentityConstraints;
- personality: traits, communicationStyle;
- visualDefaults: wardrobe, accessories, allowedStyles;
- voice: provider, voiceId, description;
- consistency: identityPrompt, negativePrompt, referenceAssetIds.

## 5. SceneSpec

Минимальные поля:
- id, personaId, order;
- emotion + intensity;
- environment, timeOfDay, season;
- pose, action, wardrobe, props;
- dialogue, narration;
- camera shot/angle;
- renderPrompt.

## 6. Эмоции

Минимум:
neutral, friendly, focused, thinking, doubtful, concerned, surprised, confident, strict, explaining, happy.

Эмоция должна быть независимым параметром сцены и не менять identity персонажа.

## 7. Контекстная адаптация

Один персонаж должен уметь использоваться в разных ситуациях:
офис, лаборатория, обучение, дом, улица, путешествие, спорт, пикник, сцена/студия.

Меняются:
- одежда;
- фон;
- реквизит;
- поза;
- действие;
- эмоция.

Не меняются:
- identityAnchor;
- базовые черты лица;
- узнаваемость персонажа.

## 8. Engine API

Минимальный runtime:
- createPersona(spec)
- getPersona(id)
- listPersonas()
- createScene(personaId, sceneInput)
- planStoryboard(topic, personaId, frameCount)
- renderFrame(sceneId, provider)
- regenerateFrame(sceneId, changedFields)
- setAgePreset(personaId, preset)
- setEmotion(sceneId, emotion, intensity)
- bindVoice(personaId, providerVoice)

## 9. Provider abstraction

Persona Engine не должен зависеть от конкретного генератора.

Нужны интерфейсы:
- ImageProvider.generate()
- AvatarProvider.listAvatars()
- AvatarProvider.listVoices()
- AvatarProvider.generateVideo() — optional
- TTSProvider.synthesize()

## 10. MVP demonstration

Для каждого из двух основных персонажей:
- 6 кадров;
- минимум 4 разные эмоции;
- минимум 2 разных окружения;
- минимум 2 варианта одежды;
- одинаковая identity.

Отдельный smoke-case:
- применить child/teen age preset;
- убедиться, что schema/prompt builder работает без отдельного кода под возраст.

## 11. Что считается успехом MVP

- [ ] единый Persona Registry;
- [ ] единый Scene Registry;
- [ ] female reference работает;
- [ ] male reference работает;
- [ ] оба используют один engine path;
- [ ] emotion switching работает;
- [ ] wardrobe/background switching работает;
- [ ] age preset является data-driven параметром;
- [ ] child/teen preset проходит smoke test;
- [ ] смена одного кадра не пересоздаёт весь storyboard;
- [ ] provider можно заменить без изменения Persona model;
- [ ] API avatars/voices подключаются к тому же persona/voice layer;
- [ ] есть тесты identity/scene schema;
- [ ] интерфейс показывает, какие параметры движок использовал.

## 12. Что не требуется для первого MVP

Не блокирует MVP:
- идеальный photoreal consistency;
- realtime animation;
- motion capture;
- lip-sync;
- LoRA training;
- десятки персонажей;
- все возрастные варианты визуально отполированными.

Сначала доказываем архитектуру на двух взрослых reference personas и одном age-preset smoke case.