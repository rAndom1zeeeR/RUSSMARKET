# AGENTS.md

Next.js app «График смен» (тестовое задание Fullstack-разработчика). Фронтенд и бэкенд в одном репозитории:
Route Handlers + Prisma 7 + SQLite. Нет авторизации; логика, сервер и компоненты покрыты тестами на Vitest, основные сценарии — E2E на Playwright.

## Stack

- Next.js 16 App Router (`src/app`), React 19, TypeScript strict
- Tailwind CSS v4 via `@tailwindcss/postcss`, tokens and breakpoints in `src/app/globals.css`
- shadcn-style UI on Radix (`radix-ui`) + `cva`. Aliases in `components.json`: UI in `@/shared/components/ui`, `cn` in `@/shared/lib/utils`
- Server state: TanStack Query. UI state and the draft of unsaved edits: Zustand. Rows are virtualized with TanStack Virtual. Drag-and-drop: `@dnd-kit/core`
- Prisma 7 + SQLite (`better-sqlite3` adapter). Client is generated into `src/generated/prisma` (git-ignored)
- Validation: zod. Dates: date-fns (ru locale)
- React Compiler is on: `reactCompiler: true` in `next.config.ts`
- Lint is oxlint, format is oxfmt. No ESLint or Prettier
- Tests: Vitest 5 + Testing Library + jsdom (coverage via v8); E2E: Playwright in `e2e/`
- Package manager is pnpm

## Commands

| Task         | Command                                                                                   |
| ------------ | ----------------------------------------------------------------------------------------- |
| Install      | `pnpm install` (runs `prisma generate`)                                                   |
| First run    | `cp .env.example .env`, then `pnpm db:setup`                                              |
| Dev server   | `pnpm dev` (`PORT` from `.env`, default 3000)                                             |
| Lint (fix)   | `pnpm lint`                                                                               |
| Lint check   | `pnpm lint:check`                                                                         |
| Format       | `pnpm format`                                                                             |
| Format check | `pnpm format:check`                                                                       |
| Unused code  | `pnpm knip`                                                                               |
| Test         | `pnpm test` (once) / `pnpm test:watch` / `pnpm test:coverage`                             |
| E2E          | `pnpm e2e` (builds the app, own server on :3100 and own DB; `pnpm e2e:ui` / `e2e:report`) |
| Check        | `pnpm check` (lint + format + knip + tests with coverage; same as CI)                     |
| Build        | `pnpm build`                                                                              |
| Start        | `pnpm start`                                                                              |
| DB           | `pnpm db:setup` / `db:seed` / `db:reset` / `db:migrate` / `db:studio`                     |

`dev` needs `.env` (`DATABASE_URL="file:./prisma/data/dev.db"`) and a seeded DB. `build` does not touch the DB.
Never commit `.env` or `prisma/data/*.db*`; the seed (`prisma/seed.ts`) is idempotent and rebuilds all data.

## Layout

`shared → entities → features → widgets → app`. A layer imports only from layers to its left; oxlint enforces it.

- `src/app/(app)/` — pages inside the shared shell (`/` overview, `/schedules`, `/schedules/[id]`). `src/app/api/` — Route Handlers
- `src/widgets/` — `app-shell` (layout, nav, drawer), `schedule-page`, `project-overview`
- `src/features/` — one user action per folder (grid, selection, quick assign, custom shift, dnd, toolbar, save/publish)
- `src/entities/` — `employee`, `shift-template`, `shift`, `schedule`: `model` (types, zod schemas, store, helpers), `api` (queries), `ui`
- `src/server/` — Prisma client, repositories, HTTP helpers. **The only place that touches the DB**; files import `server-only`
- `e2e/` — Playwright specs (`*.spec.ts`) and `support/` (DB prep and reseed, grid locators, mouse drag helper)
- `tests/` — shared test helpers (`fixtures`, `fetch` stub, `render`, `viewport`, `db`), setup and stubs. Test files live next to the code as `*.test.ts(x)`

## Conventions

- Alias `@/*` → `src/*`
- Server Components by default. `use client` only for Web APIs and interactivity
- Put new shadcn components on the aliases from `components.json`, not in `src/components`
- Do not use `any`
- Do not add ESLint, Prettier, Jest, or Playwright until they are in `package.json`
- The local SQLite DB is a deliberate choice and the code is meant to stay portable to PostgreSQL: no raw SQL, no SQLite-only Prisma types, only `src/server` touches the DB. Keep it that way. Provider and adapter live in `prisma/schema.prisma`, `src/server/db.ts` and `prisma/seed.ts`; migration steps are in the README and on the overview page. Exception: `src/server/ensure-db.ts` applies `prisma/migrations` on the first container boot (`INIT_DB=1`, marker `/data/.initialized`) because the standalone image has no Prisma CLI. Do not re-seed when the marker exists
- Request and response shapes are zod schemas in `src/entities/*/model/schemas.ts`, shared by client and Route Handlers
- Data model: a shift is keyed by `employeeId|YYYY-MM-DD` (`cellKey`). Dates are `YYYY-MM-DD` strings, times are `HH:mm`. If end ≤ start the shift crosses midnight
- Draft model: shown shifts = TanStack Query data overlaid with the Zustand `draft`. Coverage and template usage are derived, never stored. "Сохранить" sends a diff `{ upserts, deletes }` in one transaction; "Опубликовать" is enabled only without unsaved edits
- `schedule-grid.tsx` has `"use no memo"` on purpose (TanStack Virtual returns unstable functions)
- Colors, font (Manrope), radii come from Figma variables and live as tokens in `globals.css`. Use token classes (`bg-brand`, `text-muted-foreground`, …), not raw hex
- Breakpoints are `sm` 320, `md` 640, `lg` 1200 (defaults are disabled). Mobile-first: unprefixed styles apply everywhere, so `sm:` means "from 320", not "tablet". Use `md:` / `lg:` to widen. The JS side is `useBreakpoint` in `src/shared/lib/use-breakpoint.ts`: keep it in sync with `globals.css`
- oxfmt rewrites arbitrary Tailwind values into canonical utilities (`w-[335px]` became `w-84`, which is 336 px). After formatting, check pixel-exact sizes against the design
- The overview page (`/`) is data-driven from `src/widgets/project-overview/model/content.ts`. When a feature is added, removed or its status changes, update that file and the README

## Testing

Vitest runs three projects (`vitest.config.mts`):

- `unit` (node): `src/**/*.test.ts` outside `src/server` and `src/app/api`: pure logic, zod schemas, the Zustand store, overview content
- `server` (node): `src/server/**`, `src/app/api/**`, `prisma/**`. `tests/setup/db.ts` builds a fresh temp SQLite DB per test file from the real `prisma/migrations` and sets `DATABASE_URL` first. Repositories and Route Handlers run against it, no DB mocks. Never point tests at `prisma/data/dev.db`
- `dom` (jsdom): `src/**/*.test.tsx`: components, hooks, pages. `vitest.setup.ts` stubs `ResizeObserver` and `matchMedia`

Rules of thumb:

- New behavior ships with a test next to it. Coverage thresholds live in `vitest.config.mts` and are enforced by `pnpm test:coverage` (CI)
- Mock only boundaries: `fetch` (`stubFetch`), `sonner`, `next/navigation`, server repositories in page tests. Do not mock our own components or stores
- jsdom has no layout: grid tests need `stubLayoutSize` (TanStack Virtual reads `clientHeight`), breakpoint tests use `setViewportWidth`
- `user-event` does not carry Ctrl/Shift into pointer events. Use `fireEvent.pointerDown(el, { ctrlKey: true })`
- dnd-kit internals are not tested; `shift-dnd-provider.test.tsx` swaps `DndContext` for a spy and calls our handlers. Drop logic is the pure `resolveDrop` in `entities/shift/model/dnd.ts`
- `project-overview/model/content.test.ts` checks tech versions on the overview page against `package.json`. After bumping a dependency, update `content.ts`
- Vitest globals are off (`types: []` in tsconfig): import `describe`, `it`, `expect`, `vi` from `vitest`

### E2E (Playwright)

- `pnpm e2e` is not part of `pnpm check`: it needs a browser and a production build. CI runs it as a separate job
- `playwright.config.ts` builds the app and starts `next start` on port 3100 with `DATABASE_URL=file:./prisma/data/e2e.db`. It never touches `dev.db` or a running dev server. Production build on purpose: no Next dev overlay to intercept clicks
- Locally it uses the installed Chrome (`channel: "chrome"`), nothing is downloaded. In CI it installs Playwright's Chromium
- One worker, shared server and DB. The `test` from `e2e/support/test.ts` reseeds the DB before every test, so tests start from the same data (`prisma/seed.ts`: dates are relative to this week's Monday, use `dateOf(DAY.mon)` helpers, never hardcode dates)
- Two projects: `desktop` (1440×900) and `mobile` (320×640, touch, only `mobile.spec.ts`)
- Drag-and-drop uses the real mouse (`dragTo` in `e2e/support/schedule.ts`): dnd-kit starts after a 6 px move, hold `Alt` for copy
- `e2e/` is in oxlint `ignorePatterns` but type-checked by `tsc`; `pnpm format` covers it

## Known state

`pnpm knip` should pass. `@prisma/client` is in `package.json` → `knip.ignoreDependencies`: `src/generated` is gitignored, so knip cannot see that the generated client imports `@prisma/client/runtime/client`. Do not remove the package. Any other knip finding is real: fix it.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
