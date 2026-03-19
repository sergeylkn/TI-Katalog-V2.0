# TI-Katalog AI v2.0

189 промислових PDF каталогів · FastAPI + Next.js 15 · Claude AI · Railway + Vercel

## Деплой за 15 хвилин

### 1. GitHub
Завантажте ZIP → розпакуйте → створіть репозиторій на GitHub → завантажте всі файли.

### 2. Railway (Backend)
1. railway.app → New Project → Deploy from GitHub repo
2. Root Directory: `backend`
3. Add Database → PostgreSQL (DATABASE_URL додається автоматично)
4. Variables → PORT = 8000
5. Variables → ANTHROPIC_API_KEY = sk-ant-... (опціонально, можна через адмін)
6. Скопіюйте URL після деплою

### 3. Vercel (Frontend)
1. vercel.com → New Project → ваш репозиторій
2. Root Directory: `frontend`
3. Environment Variables: NEXT_PUBLIC_API_URL = https://ваш-url.railway.app
4. Deploy

### 4. Налаштування
1. Відкрийте /admin
2. Введіть Claude API ключ → Зберегти
3. Натисніть "Імпортувати всі PDF"
4. Готово! 🎉

## Структура
```
backend/
  main.py          ← FastAPI entry (auto-creates tables on start)
  api/             ← admin, documents, products, search, chat
  models/models.py ← Integer PKs, 7 tables
  services/        ← importer, extractor (Claude AI), cache
  core/database.py ← async PostgreSQL via asyncpg

frontend/
  app/             ← Next.js 15 pages (UA)
  components/      ← Navbar (section tree), ProductCard, ChatWidget
  lib/api.ts       ← typed API client (Integer IDs)
```

## API Endpoints
- POST /api/admin/set-api-key    ← зберегти Claude ключ
- GET  /api/admin/import-status  ← прогрес імпорту
- POST /api/admin/import-all-pdfs← запустити імпорт
- GET  /api/search?q=            ← гібридний пошук (Claude AI + PG FTS)
- GET  /api/documents/sections   ← ієрархія розділів
- /docs                          ← Swagger UI
