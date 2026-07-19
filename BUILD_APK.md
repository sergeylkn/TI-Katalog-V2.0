# Сборка APK в Android Studio

Нативный Android-проект уже сгенерирован (папка `android/`) — Android Studio
может собрать APK сразу, без EAS и без облака.

## Подготовка (один раз)

```powershell
git pull
npm install
```

## Вариант 1 — через Android Studio (рекомендуется)

1. Открой Android Studio → **Open** → выбери папку **`android/`** внутри проекта
   (именно `android/`, не корень репозитория).
2. Дождись окончания Gradle Sync (полоска внизу справа; первый раз — 5–10 минут,
   скачиваются зависимости).
3. Меню **Build → Build Bundle(s) / APK(s) → Build APK(s)**.
4. По окончании всплывёт уведомление «APK(s) generated» → нажми **locate**.
   Файл здесь:
   ```
   android/app/build/outputs/apk/debug/app-debug.apk
   ```
5. Перекинь `app-debug.apk` на телефон → открой → разреши «установку из
   неизвестных источников» → установи. Готово.

## Вариант 2 — одной командой из терминала

Телефон по USB с включённой отладкой (или запущенный эмулятор):

```powershell
npx expo run:android
```

Соберёт, установит и запустит приложение на устройстве автоматически.

## Вариант 3 — release-APK (для раздачи)

```powershell
cd android
.\gradlew assembleRelease
```

Файл: `android/app/build/outputs/apk/release/app-release.apk`.
Release-сборка подписывается debug-ключом из коробки; для Google Play нужен
свой keystore (скажи — настрою).

## Частые проблемы

| Симптом | Решение |
|---|---|
| «SDK location not found» | Android Studio сама создаст `android/local.properties`; либо создай вручную со строкой `sdk.dir=C:\\Users\\ASER\\AppData\\Local\\Android\\Sdk` |
| Gradle Sync висит | Проверь интернет; File → Invalidate Caches → Restart |
| «package.json does not exist» | Ты не в той папке/ветке: `git checkout claude/workout-app-react-native-gk9bla` в корне проекта |
| Ошибка про JDK | Android Studio → Settings → Build Tools → Gradle → Gradle JDK → выбери встроенный (jbr-17) |
