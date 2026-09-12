# Digital Xerox — Local Development Setup

**Last Updated:** 2026-09-11  
**Prerequisites:** Node.js 20+, npm 10+, Git

---

## 1. Clone & Install

```bash
# Navigate to project root
cd C:\Users\ganga\Desktop\project

# Install backend dependencies
cd backend
npm ci

# Install frontend dependencies
cd ../frontend
npm ci
```

---

## 2. Environment Configuration

### Backend
```bash
cd backend

# Copy example env (already exists with dev defaults)
cp .env.example .env

# Optional: Create local overrides (never committed)
cp .env.local.example .env.local  # See .env.local.example for options
```

**Default `.env` values (from `.env.example`):**
```bash
PORT=4000
API_PREFIX=/api
JWT_SECRET=dev-only-secret-change-me
JWT_EXPIRES_IN=7d
DB_FILE=storage/db.json
DOC_STORAGE=storage/documents
CORS_ORIGIN=*
SHOP_CLOSED_MESSAGE="The shop is currently closed."
NODE_ENV=development
```

### Frontend
No `.env` required for development. Vite proxies `/api` → `http://localhost:4000` via `vite.config.ts`.

---

## 3. Database Setup & Seeding

The backend uses a **JSON file database** (`storage/db.json`). No external database server required.

```bash
cd backend

# Reset local development data (clears orders, payments, documents, notifications,
# audits, and uploaded files; keeps only demo role accounts and shop catalogue)
npm run seed
```

**What seeding does:**
- Creates 3 empty development role accounts (1 student, 1 staff, 1 admin) — password `demo1234`
- Creates the stationery catalogue and pricing rules required for new orders
- Starts with zero orders, payments, uploaded documents, notifications, and audit entries
- Deletes old local uploaded files so stale documents cannot reappear

**To reset to clean state:**
```bash
npm run seed
```

---

## 4. Start Development Servers

### Option A: Two Terminals (Recommended)

**Terminal 1 — Backend:**
```bash
cd backend
npm run dev
# Starts on http://localhost:4000 with tsx watch (auto-reload on changes)
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
# Starts on http://localhost:5173 with Vite HMR
# Proxies /api/* to http://localhost:4000
```

### Option B: Single Terminal (Background)
```bash
cd backend
npm run dev &
cd ../frontend
npm run dev
```

---

## 5. Verify Installation

| Check | Command | Expected |
|-------|---------|----------|
| Backend health | `curl http://localhost:4000/api` | 404 but server responds (Express running) |
| Frontend loads | Open http://localhost:5173 | Landing page with "Digital Xerox" |
| Login works | Use accounts below | Redirects to role dashboard |

---

## 6. Development Login Accounts

| Role | Email | Password | Dashboard |
|------|-------|----------|-----------|
| **Student** | `gangadhar@mlrit.ac.in` | `demo1234` | `/student` |
| **Student** | `meera@college.edu` | `demo1234` | `/student` |
| **Staff** | `scope@mlrit.ac.in` | `demo1234` | `/staff` |
| **Admin** | `mlrit@mlrit.ac.in` | `demo1234` | `/admin` |

> All seeded users use the same password `demo1234`. This is a **development fixture only** — never use in production.

---

## 7. Run Tests

### Backend Tests
```bash
cd backend
npm run typecheck   # TypeScript check (no emit)
npm run build       # Compile to dist/
npm test            # 37 integration tests (vitest + supertest)
```

### Frontend Tests
```bash
cd frontend
npm run typecheck   # tsc -b (project references)
npm run lint        # eslint . (0 errors expected)
npm test            # 13 unit tests (vitest + RTL)
npm run build       # vite build → dist/
```

---

## 8. Build for Production

```bash
# Backend
cd backend
npm run build       # Outputs to dist/
npm start           # Runs node dist/index.js

# Frontend
cd frontend
npm run build       # Outputs to dist/ (static assets)
# Serve with any static host (nginx, Vercel, Netlify, etc.)
```

---

## 9. Project Structure Quick Reference

```
project/
├── backend/
│   ├── src/
│   │   ├── config/env.ts          # Environment config
│   │   ├── data/
│   │   │   ├── repo.ts            # Repository layer (CRUD + queries)
│   │   │   ├── store.ts           # JsonStore (atomic file persistence)
│   │   │   └── seedData.ts        # Comprehensive seed data
│   │   ├── middleware/auth.ts     # JWT verification + role guards
│   │   ├── routes/                # 7 route modules
│   │   ├── services/              # Business logic (auth, orders, payments, etc.)
│   │   ├── types.ts               # Database TypeScript interfaces
│   │   ├── app.ts                 # Express app factory
│   │   └── index.ts               # Entrypoint
│   ├── test/                      # Integration tests (3 files)
│   ├── storage/                   # Created at runtime (db.json, documents/)
│   ├── .env.example
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── app/router/AppRouter.tsx   # HashRouter + role guards
│   │   ├── features/                  # Feature modules (admin, auth, order, staff, student)
│   │   ├── services/api/              # API clients
│   │   ├── hooks/useApi.ts, useLive.ts
│   │   ├── styles/design.css          # Complete design system
│   │   ├── types/index.ts             # Shared TypeScript types
│   │   └── main.tsx                   # App entry
│   ├── vite.config.ts                 # Vite + proxy config
│   └── package.json
│
├── FULL_STACK_AUDIT.md
├── LOCAL_SETUP.md
├── LOCAL_TESTING.md
└── .env.local.example
```

---

## 10. Troubleshooting

| Issue | Solution |
|-------|----------|
| `Port 4000 already in use` | Kill existing process: `npx kill-port 4000` or change `PORT` in `.env` |
| `Port 5173 already in use` | Vite auto-picks next port (5174, 5175...) |
| `Cannot find module` | Run `npm ci` in both `backend/` and `frontend/` |
| `JWT secret warning` | Expected in dev — uses default. Set `JWT_SECRET` in `.env.local` for custom. |
| `CORS errors` | Backend sets `CORS_ORIGIN=*` by default. Check `.env`. |
| `File upload fails` | Ensure `storage/documents/` is writable (created by seed) |
| `Tests fail` | Run `npm run seed` first — tests use isolated temp DB |
| `Frontend can't reach backend` | Verify backend running on 4000, check `vite.config.ts` proxy |

---

## 11. Useful Commands

```bash
# Reset database and uploaded files to a clean local slate
cd backend && npm run seed

# Watch backend tests
cd backend && npm run test:watch

# Watch frontend tests
cd frontend && npm test -- --watch

# Typecheck both
cd backend && npm run typecheck && cd ../frontend && npm run typecheck

# Lint frontend
cd frontend && npm run lint

# View backend logs (dev)
# Logs appear in terminal running `npm run dev`

# View frontend logs
# Browser DevTools console + Vite terminal
```

---

## 12. No Docker Required

This project runs **entirely on the host** with Node.js. The JSON file database and local filesystem storage require no containers.

**If you prefer Docker**, a minimal `docker-compose.yml` would only add complexity without benefit for local development. The current setup is simpler and faster.

