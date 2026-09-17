# ALINA Universal KB — домен Legal / Information Security

Этот каталог **не является отдельной базой для отдельного агента**. Это доменный слой общей Knowledge Base, на который могут ссылаться Аналитик, Security, Regulatory, OSINT, Programmer и другие роли.

## Главный принцип

```text
ONE DOCUMENT
→ ONE CANONICAL DOCUMENT ID
→ ONE SOURCE/CAPTURE CHAIN
→ MANY AGENTS MAY REFERENCE IT
→ ZERO DUPLICATE COPIES
```

Имя скачанного файла не считается названием документа. Для каждого файла сначала читается содержимое и только затем формируется карточка документа.

## Канонический реестр

```text
document_registry.v1.json
```

Минимальная карточка содержит:

```text
document_id
source_id
capture_id
sha256
full_title
document_type
issuer
document_number
document_date_raw
document_date_iso
subject
security_tags
collection
origin_class
source_locators
status
review_status
legal_status
```

## Статусы

```text
RECEIVED
→ PARSED
→ IDENTIFIED
→ PROPOSED
→ REVIEWED
→ VERIFIED
```

`legal_status` (действует / отменён / изменён / проект и т.п.) нельзя определять только из локального PDF, если это не следует непосредственно из текста. Для юридической актуальности требуется отдельная проверка по официальному источнику.

## Связь с FATHER pipeline

```text
K0 RECEIVE
→ K1 REGISTER + SHA-256 + dedup
→ K2 READ/PARSE
→ K1.5 DOCUMENT IDENTITY
     full title / issuer / number / date / subject
→ K4 STRUCTURE
     article / clause / appendix / table
→ K5–K7 semantic extraction
→ K11 legal/security validation
→ K13 authorized publish
```

Автоматический intake может создать только `PROPOSED` запись. `VERIFIED` требует review и, для статуса действия нормативного документа, официальной внешней проверки.
