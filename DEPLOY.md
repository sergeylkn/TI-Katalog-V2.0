# 🚀 Деплой Технічного Каталогу AI за 15 хвилин
## Тільки браузер — без термінала

---

## Що ви отримаєте

| Компонент | Де | Ціна |
|-----------|-----|------|
| Frontend (Next.js 14) | Vercel | Безкоштовно |
| Backend (FastAPI) | Railway | $5/міс або безкоштовний tier |
| База даних (PostgreSQL) | Railway | Вбудовано |
| AI пошук | Claude API (Anthropic) | Pay per use |

---

## КРОК 1 — Завантажте на GitHub (3 хв)

### 1.1 Створіть репозиторій
1. Відкрийте [github.com](https://github.com) → **New repository**
2. Назва: `catalog-ai` → **Create repository**
3. GitHub покаже інструкції — вони вам не знадобляться

### 1.2 Завантажте файли
**Варіант A — через браузер (найпростіше):**
1. На сторінці репозиторію натисніть **uploading an existing file**
2. Перетягніть ВСІ файли та папки з ZIP-архіву
3. Натисніть **Commit changes**

**Варіант B — через GitHub Desktop:**
1. Скачайте [GitHub Desktop](https://desktop.github.com)
2. **File → Add Local Repository** → виберіть розпаковану папку
3. **Publish repository**

> ⚠️ Структура повинна бути:
> ```
> repository/
> ├── backend/
> │   ├── Dockerfile
> │   ├── main.py
> │   └── ...
> ├── frontend/
> │   ├── package.json
> │   └── ...
> └── README.md
> ```

---

## КРОК 2 — Deploy Backend на Railway (5 хв)

### 2.1 Реєстрація та підключення
1. Відкрийте [railway.app](https://railway.app)
2. Натисніть **Login** → **Login with GitHub**
3. Авторизуйте Railway доступ до GitHub

### 2.2 Створення проекту
1. Натисніть **+ New Project**
2. Виберіть **Deploy from GitHub repo**
3. Знайдіть `catalog-ai` у списку → клікніть

### 2.3 Налаштування папки backend
1. Railway спитає яку папку деплоїти
2. Натисніть **Configure** → **Root Directory** → введіть `backend`
3. Railway знайде `Dockerfile` автоматично

### 2.4 Додайте PostgreSQL
1. В проекті натисніть **+ New** → **Database** → **Add PostgreSQL**
2. Railway автоматично додасть `DATABASE_URL` до змінних бекенду
3. Зачекайте 30 секунд поки база запуститься (зелений індикатор)

### 2.5 Додайте змінну PORT
1. Клікніть на сервіс бекенду (не базу даних)
2. Вкладка **Variables** → **+ New Variable**
3. Key: `PORT` · Value: `8000`
4. Натисніть **Add**

### 2.6 Отримайте URL бекенду
1. Вкладка **Settings** → **Networking**
2. Натисніть **Generate Domain**
3. Скопіюйте URL — він виглядає як:
   `https://catalog-ai-production-xxxx.up.railway.app`
4. **Збережіть цей URL** — він знадобиться для Vercel

### 2.7 Перевірте деплой
1. Відкрийте `https://YOUR-RAILWAY-URL/health` у браузері
2. Ви повинні побачити: `{"status":"ok","version":"1.0.0"}`
3. Якщо бачите — бекенд працює! ✅

> ⏱ Перший деплой займає 3-5 хвилин (встановлення залежностей)

---

## КРОК 3 — Deploy Frontend на Vercel (4 хв)

### 3.1 Реєстрація
1. Відкрийте [vercel.com](https://vercel.com)
2. Натисніть **Sign Up** → **Continue with GitHub**

### 3.2 Імпорт проекту
1. Натисніть **Add New...** → **Project**
2. Знайдіть `catalog-ai` → натисніть **Import**

### 3.3 Налаштування
На сторінці налаштувань:

1. **Framework Preset** → переконайтесь що вибрано **Next.js**
2. **Root Directory** → натисніть **Edit** → введіть `frontend`
3. **Environment Variables** → натисніть **Add**:
   - Key: `NEXT_PUBLIC_API_URL`
   - Value: `https://YOUR-RAILWAY-URL` (URL з кроку 2.6, **без слешу в кінці**)
4. Натисніть **Deploy**

### 3.4 Отримайте URL фронтенду
1. Через ~2 хвилини деплой завершиться
2. Vercel покаже URL: `https://catalog-ai-xxxx.vercel.app`
3. Відкрийте цей URL — ви побачите головну сторінку каталогу ✅

---

## КРОК 4 — Налаштування AI (3 хв)

### 4.1 Отримайте Claude API ключ
1. Відкрийте [console.anthropic.com](https://console.anthropic.com)
2. Зареєструйтесь або увійдіть
3. **API Keys** → **Create Key**
4. Скопіюйте ключ — він починається з `sk-ant-`

### 4.2 Введіть ключ в адмін-панелі
1. Відкрийте `https://YOUR-VERCEL-URL/admin`
2. В полі **Claude API Ключ** вставте ваш ключ
3. Натисніть **Зберегти**
4. Ви побачите: `✅ API ключ збережено`

### 4.3 Запустіть імпорт PDF
1. Перейдіть на вкладку **Імпорт PDF**
2. Натисніть **Імпортувати всі PDF**
3. Система почне завантажувати файли з R2 бакету
4. На вкладці **Огляд** ви побачите прогрес у реальному часі

> ⏱ Імпорт 198 PDF займає 15-30 хвилин у фоні

---

## 🎉 Готово!

| Сторінка | URL |
|----------|-----|
| Головна (розділи) | `https://YOUR-VERCEL-URL/` |
| AI Пошук | `https://YOUR-VERCEL-URL/search` |
| Адмін-панель | `https://YOUR-VERCEL-URL/admin` |
| API документація | `https://YOUR-RAILWAY-URL/docs` |

---

## ❓ Часті проблеми

### Бекенд не відповідає
- Перевірте логи Railway: проект → сервіс → **Deployments** → клікніть останній
- Переконайтесь що `PORT=8000` додано у Variables
- Переконайтесь що PostgreSQL підключено (зелений статус)

### Фронтенд показує помилку CORS
- Перевірте що `NEXT_PUBLIC_API_URL` у Vercel не має слешу в кінці
- URL повинен бути `https://xxx.railway.app` а не `https://xxx.railway.app/`
- У Vercel: **Settings** → **Environment Variables** → редагуйте → **Redeploy**

### AI пошук не працює
- Переконайтесь що API ключ збережено (адмін → зелений статус "Налаштовано")
- Перевірте баланс на [console.anthropic.com](https://console.anthropic.com)
- Переконайтесь що є товари в каталозі (потрібен імпорт)

### PDF не завантажуються
- Перевірте що URL R2 бакету правильний у `backend/services/importer.py`
- Спробуйте відкрити `https://pub-ada201ec5fb84401a3b36b7b21e6ed0f.r2.dev/manifest.txt`

### Помилка "Cannot find module"
- Railway: перевірте що **Root Directory** = `backend`
- Vercel: перевірте що **Root Directory** = `frontend`

---

## 🔄 Оновлення після деплою

Щоб оновити код:
1. Змініть файли у GitHub (через браузер або GitHub Desktop)
2. Railway та Vercel автоматично передеплоять ваш сервіс
3. Новий деплой займає ~2-3 хвилини

---

## 💡 Архітектура

```
[Browser]
    │
    ▼
[Vercel — Next.js 14]
    │ NEXT_PUBLIC_API_URL
    ▼
[Railway — FastAPI]
    │ DATABASE_URL (автоматично)
    ├──► [PostgreSQL]
    │       ├── settings (API ключ)
    │       ├── documents (PDF файли)
    │       ├── products (товари)
    │       └── ...
    │
    ├──► [Cloudflare R2] (PDF файли)
    │
    └──► [Anthropic API] (Claude AI)
              ▲
              └── ключ зберігається в БД
```

---

## 📊 Ліміти безкоштовних тарифів

| Сервіс | Безкоштовний ліміт |
|--------|-------------------|
| Vercel | 100GB bandwidth/міс, необмежені деплої |
| Railway | $5 кредит/міс (вистачає на ~500 год) |
| Anthropic | $5 кредит при реєстрації |

> Для продакшн-навантаження рекомендується Railway Starter ($5/міс) та поповнення балансу Anthropic.
