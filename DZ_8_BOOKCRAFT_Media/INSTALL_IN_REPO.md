# Установка в репозиторий Vibe-coding

Распакуйте папку `dz6-book-studio` по адресу:

```text
G:\1\Vibe coding\Vibe-coding\DZ_6_WeWeb_Lovable\DZ_6\dz6-book-studio
```

Материалы преподавателя в родительской папке не удаляйте.

Запуск:

```text
G:\1\Vibe coding\Vibe-coding\DZ_6_WeWeb_Lovable\DZ_6\dz6-book-studio\START_BOOK_STUDIO.cmd
```

После проверки добавляйте в Git только новую папку:

```powershell
Set-Location "G:\1\Vibe coding\Vibe-coding"
git add -- "DZ_6_WeWeb_Lovable/DZ_6/dz6-book-studio"
git status --short
git commit -m "Add DZ-6 local AI scenario studio"
```

Не используйте `git add .`, пока в репозитории остаются посторонние изменения.
