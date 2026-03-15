# Technology Stack

This project uses a modern **TypeScript full-stack architecture**.

---

# Frontend

Framework:

- Next.js (App Router)

Language:

- TypeScript

UI:

- Tailwind CSS
- shadcn/ui

State Management:

- Zustand
- TanStack Query

Authentication:

- Access token (JWT) in payload/header
- Refresh token in HttpOnly cookie

Forms and Validation:

- React Hook Form
- Zod
- `@hookform/resolvers`

---

# Backend

Framework:

- NestJS

Language:

- TypeScript

Architecture:

- Modular architecture
- REST API

Authentication:

- JWT
- Passport.js strategies/guards
- Role-based access

---

# Database

Database:

- PostgreSQL

ORM:

- Drizzle ORM
- Location: `apps/api/src/db` + `apps/api/drizzle.config.ts`

Benefits:

- Fully typed SQL
- Lightweight
- Works well with monorepos

---

# Dev Tools

Package Manager:

- pnpm

Monorepo:

- Turborepo

Containers (local dev):

- Docker Compose
- Services: workspace, postgres, migration, api, web

Linting:

- ESLint

Formatting:

- Prettier

---

# Deployment (Possible Options)

Frontend:

- Vercel

Backend:

- Railway
- Fly.io
- DigitalOcean

Database:

- Supabase Postgres
- Neon
- Railway Postgres

---

# Why This Stack

Advantages:

- Fully TypeScript
- Strong typing across frontend and backend
- Scalable architecture
- High performance
- Easy to maintain
