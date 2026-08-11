# HANDOFF — Kettle&Body / «Тренировка дня»

Документ-передача проекта. Открой ветку в новой сессии (в т.ч. Cowork) и продолжай
строго по разделу «Что осталось».

- **Репозиторий:** `sergeylkn/ti-katalog-v2.0`
- **Рабочая ветка:** `claude/workout-app-react-native-gk9bla`
- **Стек:** React Native + Expo (SDK 51), expo-speech (uk-UA), react-native-svg, Vibration API
- **Дизайн-схема:** Volt Impact (лайм `#C6FF00` на near-black `#0A0B0E`), без оранжевого
- **Дата хендоффа:** 2026-08-11

---

## Что уже готово

- **App.js** — единый файл приложения. Каталог **36 упражнений** (гиря + своя вага),
  GROUPS по группам мышц, MM (карты подсветки мышц на все 36), SVG-компоненты
  BodyFront/BodyBack/MiniMap, экраны Home / Catalog (поиск+фильтр) / Detail
  (медиа-блок с ▶, переключатель веса 16/24/32, «КАРТА М'ЯЗІВ», карточки шагов
  техники) / Workout (таймер prep→work→rest, отсчёт 3-2-1, голос uk-UA).
- **assets/exercises/** — 72 картинки (36 tech + 36 anatomy), 512×512 JPEG из Stitch,
  плюс `index.js` со статическими `require()` (Metro требует статические пути).
- **Дизайн Stitch** — проект «Volt Impact», id в
  `scratchpad/volt-proj-id.txt` (`14784055763301818411`).
- **design/kettlebody-mockups.html** — галерея всех экранов (артефакт).
- **design/kettlebody-prototype.html** — кликабельный прототип «замкнутого цикла»
  с зацикленными SVG-анимациями техники.
- **CI-сборки (GitHub Actions):**
  - `.github/workflows/build-apk.yml` — release APK на push (paths: App.js,
    package.json, app.json, assets/**, android/**). Артефакт `kettlebody-workout-apk`.
  - `.github/workflows/fetch-assets.yml` — качает картинки из `assets-manifest.json`
    в `assets/exercises/` (обходит блокировку image-серверов в окружении).
- **Локальная/EAS-сборка невозможна** — сетевая политика окружения блокирует
  dl.google.com и api.expo.dev. APK собираем ТОЛЬКО через GitHub Actions.

## Текущая фича в работе: петли-кадры техники (3 кадра на упражнение)

Цель: на кнопке ▶ в DetailScreen проигрывать зациклённый слайд-шоу из 3 кадров
(старт → середина → фініш) для каждого упражнения.

- **Средний кадр** = уже существующий `*-tech.jpg`.
- **Старт (f1) и фініш (f3)** генерируются в Stitch, url'ы копятся в
  **`frames-manifest.json`** (закоммичен в git — переживает рестарт контейнера).
- Промпты кадров: `scratchpad/req8-NNN-slug-{f1,f3}.json` (72 шт).
  STYLE LOCK: «Volt Impact: near-black #0A0B0E studio background, dramatic
  high-contrast rim lighting in volt-lime #C6FF00, one athletic person, side view,
  full body…» + описание позы START/FINISH.
- **Свипер:** `scratchpad/sweeper.sh` — автономный цикл. Каждый круг заново
  вычисляет недостающие кадры (manifest vs req8-*.json), генерит через Stitch,
  извлекает downloadUrl скриншота, коммитит+пушит manifest по каждому успеху.
  Ключевое: список недостающих пересчитывается каждый круг → сбои авто-ретраятся.
  Нумерация в именах файлов не важна, ключ = slug/phase.

### Прогресс кадров: **56 / 72**

Осталось 16:
```
bw-bridge/f3  bw-burpee/f1  bw-burpee/f3  bw-climber/f1  bw-climber/f3
bw-crunch/f1  bw-crunch/f3  bw-jack/f1    bw-jack/f3     bw-plank/f1
bw-plank/f3   bw-superman/f1 bw-superman/f3 kb-curl/f1   kb-tgu/f1  kb-tri/f3
```
Причина медленности: Stitch-сервер периодически рвёт долгие (~90с) соединения —
эти конкретные кадры попадают в «плохие окна». Свипер грызёт их до победы.

---

## Что осталось (по порядку)

1. **Догенерить 16 кадров** до 72/72. Держать свипер живым
   (`pgrep -f sweeper.sh`; если умер — `nohup bash scratchpad/sweeper.sh &`).
   Проверка счётчика:
   ```
   python3 -c "import json;d=json.load(open('frames-manifest.json'));print(sum(len([k for k in v if v[k]]) for v in d.values()),'/72')"
   ```
2. **Скачать кадры в репо.** Расширить/добавить workflow по образцу
   `fetch-assets.yml`, но источник — `frames-manifest.json`, назначение —
   `assets/exercises/{slug}-f1.jpg` / `-f3.jpg`. Переименовать JPEG→.jpg по
   реальному типу (magic bytes `\xff\xd8\xff`) — AAPT2 отклоняет JPEG с .png.
3. **Собрать индекс кадров** — добавить f1/f3 в `assets/exercises/index.js`
   (`EX_IMAGES[slug].f1 / .f3`) статическими `require()`.
4. **Вшить петлю в App.js** — в DetailScreen медиа-блок: ▶ прокручивает
   f1 → tech(середина) → f3 по кругу (setInterval, ~600–800 мс/кадр).
5. **Пересобрать APK** — коммит в App.js/assets триггерит build-apk.yml.
   Артефакт `kettlebody-workout-apk` в последнем прогоне Actions.

## Подводные камни (уже наступали)

- Scratchpad `/tmp` стирается при рестарте контейнера → всё важное коммить в git.
- Stitch отдаёт JPEG под .png → переименовывать по содержимому, иначе AAPT2 падает.
- APK-билд не триггерился на «только assets» → в paths добавлен `assets/**`.
- Динамические пути картинок Metro не поддерживает → только статические `require()`.
