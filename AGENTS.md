# AGENTS.md

Next.js app «График смен» (тестовое задание Fullstack-разработчика). Фронтенд и бэкенд в одном репозитории:
Route Handlers + Prisma 7 + SQLite. Нет авторизации, тестов и E2E.

## Stack

- Next.js 16 App Router (`src/app`), React 19, TypeScript strict
- Tailwind CSS v4 via `@tailwindcss/postcss`, tokens and breakpoints in `src/app/globals.css`
- shadcn-style UI on Radix (`radix-ui`) + `cva`. Aliases in `components.json`: UI in `@/shared/components/ui`, `cn` in `@/shared/lib/utils`
- Server state: TanStack Query. UI state and the draft of unsaved edits: Zustand. Rows are virtualized with TanStack Virtual. Drag-and-drop: `@dnd-kit/core`
- Prisma 7 + SQLite (`better-sqlite3` adapter). Client is generated into `src/generated/prisma` (git-ignored)
- Validation: zod. Dates: date-fns (ru locale)
- React Compiler is on: `reactCompiler: true` in `next.config.ts`
- Lint is oxlint, format is oxfmt. No ESLint or Prettier
- Package manager is pnpm

## Commands

| Task         | Command                                                               |
| ------------ | --------------------------------------------------------------------- |
| Install      | `pnpm install` (runs `prisma generate`)                               |
| First run    | `cp .env.example .env`, then `pnpm db:setup`                          |
| Dev server   | `pnpm dev` (port 3000)                                                |
| Lint (fix)   | `pnpm lint`                                                           |
| Lint check   | `pnpm lint:check`                                                     |
| Format       | `pnpm format`                                                         |
| Format check | `pnpm format:check`                                                   |
| Unused code  | `pnpm knip`                                                           |
| Check        | `pnpm check` (lint + format + knip; same as CI)                       |
| Build        | `pnpm build`                                                          |
| Start        | `pnpm start`                                                          |
| DB           | `pnpm db:setup` / `db:seed` / `db:reset` / `db:migrate` / `db:studio` |

`dev` needs `.env` (`DATABASE_URL="file:./prisma/data/dev.db"`) and a seeded DB. `build` does not touch the DB.
Never commit `.env` or `prisma/data/*.db*`; the seed (`prisma/seed.ts`) is idempotent and rebuilds all data.

## Layout

`shared → entities → features → widgets → app`. A layer imports only from layers to its left; oxlint enforces it.

- `src/app/(app)/` — pages inside the shared shell (`/` overview, `/schedules`, `/schedules/[id]`). `src/app/api/` — Route Handlers
- `src/widgets/` — `app-shell` (layout, nav, drawer), `schedule-page`, `project-overview`
- `src/features/` — one user action per folder (grid, selection, quick assign, custom shift, dnd, toolbar, save/publish)
- `src/entities/` — `employee`, `shift-template`, `shift`, `schedule`: `model` (types, zod schemas, store, helpers), `api` (queries), `ui`
- `src/server/` — Prisma client, repositories, HTTP helpers. **The only place that touches the DB**; files import `server-only`

## Conventions

- Alias `@/*` → `src/*`
- Server Components by default. `use client` only for Web APIs and interactivity
- Put new shadcn components on the aliases from `components.json`, not in `src/components`
- Do not use `any`
- Do not add ESLint, Prettier, Jest, or Playwright until they are in `package.json`
- The local SQLite DB is a deliberate choice and the code is meant to stay portable to PostgreSQL: no raw SQL, no SQLite-only Prisma types, only `src/server` touches the DB. Keep it that way. Provider and adapter live in `prisma/schema.prisma`, `src/server/db.ts` and `prisma/seed.ts`; migration steps are in the README and on the overview page
- Request and response shapes are zod schemas in `src/entities/*/model/schemas.ts`, shared by client and Route Handlers
- Data model: a shift is keyed by `employeeId|YYYY-MM-DD` (`cellKey`). Dates are `YYYY-MM-DD` strings, times are `HH:mm`. If end ≤ start the shift crosses midnight
- Draft model: shown shifts = TanStack Query data overlaid with the Zustand `draft`. Coverage and template usage are derived, never stored. "Сохранить" sends a diff `{ upserts, deletes }` in one transaction; "Опубликовать" is enabled only without unsaved edits
- `schedule-grid.tsx` has `"use no memo"` on purpose (TanStack Virtual returns unstable functions)
- Colors, font (Manrope), radii come from Figma variables and live as tokens in `globals.css`. Use token classes (`bg-brand`, `text-muted-foreground`, …), not raw hex
- Breakpoints are `sm` 320, `md` 640, `lg` 1200 (defaults are disabled). Mobile-first: unprefixed styles apply everywhere, so `sm:` means "from 320", not "tablet". Use `md:` / `lg:` to widen. The JS side is `useBreakpoint` in `src/shared/lib/use-breakpoint.ts`: keep it in sync with `globals.css`
- oxfmt rewrites arbitrary Tailwind values into canonical utilities (`w-[335px]` became `w-84`, which is 336 px). After formatting, check pixel-exact sizes against the design
- The overview page (`/`) is data-driven from `src/widgets/project-overview/model/content.ts`. When a feature is added, removed or its status changes, update that file and the README

## Known state

`pnpm knip` should pass. `@prisma/client` is in `package.json` → `knip.ignoreDependencies`: `src/generated` is gitignored, so knip cannot see that the generated client imports `@prisma/client/runtime/client`. Do not remove the package. Any other knip finding is real: fix it.
