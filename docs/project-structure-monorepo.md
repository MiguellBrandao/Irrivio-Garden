# Project Structure — Monorepo (pnpm + Turborepo)

This project uses a **monorepo architecture** to manage frontend, backend, and shared code in a single repository.

Tools used:
- pnpm (package manager)
- Turborepo (task orchestration & caching)

---

# Root Structure

```
garden-management/
│
├─ apps/
│  ├─ web/           # Next.js frontend
│  └─ api/           # NestJS backend
│
├─ packages/
│  ├─ database/      # Drizzle schema + database client
│  └─ types/         # Shared TypeScript types
├─ turbo.json
├─ pnpm-workspace.yaml
├─ package.json
└─ README.md
```

---

# apps/web (Next.js Frontend)

```
apps/web
│
├─ app/
│  ├─ (private)/
│  │  ├─ dashboard/
│  │  ├─ calendar/
│  │  ├─ gardens/
│  │  ├─ employees/
│  │  ├─ teams/
│  │  ├─ products/
│  │  ├─ payments/
│  │  └─ quotes/
│  └─ login/
│
├─ features/
│  ├─ dashboard/
│  ├─ calendar/
│  ├─ gardens/
│  ├─ employees/
│  ├─ teams/
│  ├─ products/
│  ├─ payments/
│  └─ quotes/
│
├─ components/
│  ├─ ui/            # shadcn/ui (base required components)
│  ├─ forms/
│  ├─ tables/
│  └─ calendar/
│
├─ lib/
│  ├─ api/
│  ├─ auth/
│  └─ utils/
│
└─ styles/
```

---

# apps/api (NestJS Backend)

```
apps/api/src

auth/
users/
employees/
teams/
gardens/
tasks/
worklogs/
products/
product-usage/
payments/
quotes/
```

Each module follows the NestJS structure:

```
module.ts
controller.ts
service.ts
dto/
repository/
```

---

# packages/database

Contains the **Drizzle ORM setup**.

```
packages/database

schema/
  users.ts
  employees.ts
  teams.ts
  gardens.ts
  tasks.ts
  products.ts
  payments.ts
  quotes.ts

client.ts
drizzle.config.ts
```

---

# Turborepo Configuration

Example `turbo.json`:

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^lint"]
    },
    "test": {
      "dependsOn": ["^test"],
      "outputs": ["coverage/**"]
    },
    "typecheck": {
      "dependsOn": ["^typecheck"]
    }
  }
}
```

---

# pnpm Workspace

`pnpm-workspace.yaml`

```yaml
packages:
  - apps/*
  - packages/*
```

---

# Benefits of This Setup

- Shared code between frontend and backend
- Faster builds with caching
- Easier dependency management
- Clean separation of services
