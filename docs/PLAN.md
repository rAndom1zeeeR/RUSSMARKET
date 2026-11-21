# План реализации: страница «График смен»

> **Это исходный план.** Актуальное устройство — в README и AGENTS.md, известные проблемы — в `docs/ANALYSIS.md`.
>
> **Статус: этапы 1–8 реализованы** (см. README). После плана добавлены: Postgres на проде (база выбирается по `DATABASE_URL`, SQLite остался для разработки), тесты Vitest и E2E на Playwright, адаптив 320/640/1200, главная с обзором проекта, Docker и CI. Отличия от плана: черновик правок — это map `draft` (ячейка → значение | null), а не список `pendingOps`; URL БД — `file:./prisma/data/dev.db` (относительно корня проекта); SSR-prefetch не делался — данные грузятся Query на клиенте; в `.oxlintrc.json` отключены `react-perf/*` (React Compiler включён), добавлены точечные overrides. Перенос смены между ячейками — одной смены (не всего выделения).
>
> **Расхождение с решением §10.1:** быстрое назначение по дате сейчас ставит смену только видимым сотрудникам (поиск сужает список). Должно ставить всем, поиск не влияет. Код ещё не приведён: `QuickAssignMenu` получает уже отфильтрованные `employeeIds`.

Next.js 16 (App Router) + React 19 + TS strict + Tailwind v4 + shadcn/ui. Стек данных: **TanStack Query + Zustand** (+ TanStack Virtual).

## 1. Выбор технологий

| Задача                                    | Технология                                                                                         | Зачем                                                                                                                          |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Server state (сотрудники, шаблоны, смены) | `@tanstack/react-query` v5                                                                         | Кэш, оптимистичные мутации, откат при ошибке, инвалидация                                                                      |
| UI state (клиентское)                     | `zustand`                                                                                          | Режим вида, дата, поиск, выделение, черновик «Своей смены», drag-состояние. Селекторы → меньше перерисовок                     |
| Виртуализация                             | `@tanstack/react-virtual`                                                                          | Список сотрудников (в макете строки обрезаются снизу — скролл) и 28–31 колонка в месяце                                        |
| Drag-and-drop                             | `@dnd-kit/core`                                                                                    | Pointer/Touch/Keyboard sensors, DragOverlay, collision detection по ячейкам. Нативный HTML5 DnD хуже по a11y и тач-устройствам |
| Даты                                      | `date-fns` (+ `ru` locale)                                                                         | Недели с пн, форматирование, диапазоны                                                                                         |
| БД / ORM                                  | **Prisma 7**: SQLite локально (`better-sqlite3`), Postgres на проде (`@prisma/adapter-pg`)         | Типобезопасный доступ к данным, миграции, seed. Изначально план был только на SQLite, Postgres добавлен для деплоя             |
| Валидация                                 | `zod`                                                                                              | Единые схемы для API-роутов и «Своей смены», типы через `z.infer`. Отдельной form-библиотеки нет                               |
| Тосты                                     | `sonner`                                                                                           | Результат сохранения/публикации, ошибки                                                                                        |
| Меню/поповеры                             | shadcn: `popover`, `command`/`dropdown-menu`, `button`, `input`, `toggle-group`, `badge`, `avatar` | Быстрое назначение, переключатель Месяц/Неделя                                                                                 |
| Иконки                                    | `lucide-react` (уже есть)                                                                          |                                                                                                                                |

**TanStack Table не берём** (решение §10.3) — календарная сетка с кастомными ячейками, выделением и DnD не табличные данные; хватает Query + Virtual. Table добавил бы абстракцию без пользы.

**Backend и БД.** Route Handlers (`src/app/api/**`) + **Prisma 7 / SQLite**, файл БД в проекте: `prisma/data/dev.db` (`DATABASE_URL="file:./data/dev.db"` в `.env`, пример в `.env.example`). Фронт ходит только через `fetch` → граница frontend/backend остаётся явной, слой `shared/api` можно заменить на внешний бэк.

Особенности Prisma 7, которые учитываем:

- генератор `prisma-client` с явным `output = "../src/generated/prisma"` (каталог в `.gitignore`, генерируется `prisma generate`);
- URL БД в `prisma.config.ts` (там же `migrations.seed = "tsx prisma/seed.ts"`; `tsx` уже в devDependencies), а не в `schema.prisma`;
- клиент создаётся **через driver adapter**: `new PrismaClient({ adapter: new PrismaBetterSqlite3({ url }) })`; singleton в `globalThis` (HMR);
- `better-sqlite3` — нативный модуль: добавить в `pnpm.onlyBuiltDependencies` и `serverExternalPackages: ["better-sqlite3"]` в `next.config.ts`;
- работа с БД только в Server Components / Route Handlers (`import "server-only"`), в клиентский бандл не попадает.

Скрипты: `db:generate`, `db:migrate` (`prisma migrate dev`), `db:seed`, `db:reset`, `db:studio`; `pnpm db:setup` = generate + migrate deploy + seed. Файл БД в git **не коммитим** (`prisma/data/*.db*` в `.gitignore`), а любой человек поднимает проект с готовыми данными так:

```bash
pnpm install
cp .env.example .env     # DATABASE_URL="file:./data/dev.db"
pnpm db:setup            # generate + migrate deploy + seed
pnpm dev
```

**Сидер** (`prisma/seed.ts`, запуск `tsx`, идемпотентный: перед вставкой чистит таблицы в транзакции, поэтому `pnpm db:seed` можно запускать повторно; `db:reset` = `migrate reset` + seed):

- 8 сотрудников из макета (Кузнецова Алина, Волков Тимур, Морозова Виктория, Соколов Артём, Лебедева Полина, Новиков Кирилл, Ерохина Дарья, Гаврилов Егор), роль «агент», 24 ч; аватары — статические файлы в `public/avatars/` (нет файла → fallback с инициалами);
- 3 шаблона: Утро 07:00–15:00, День 10:00–18:00, Вечер 15:00–23:00 (порядок и цвета как в макете);
- 1 расписание (draft) на неделю/месяц из макета с готовыми сменами, чтобы страница была «живой» сразу: Кузнецова — День вт, ср + своя 10–23 чт, пт; Волков — День вт, ср + Вечер пт; Морозова и Соколов — День чт; Лебедева — Утро вт, День чт, пт;
- даты смен считаются **относительно текущей недели** (а не хардкод), чтобы данные не уходили из видимого периода;
- пустая неделя/месяц тоже доступны (для проверки назначения с нуля).

Если `.env`/БД нет — `pnpm dev` не падает молча: API возвращает понятную ошибку «выполните `pnpm db:setup`», а в README — те же 4 команды.

## 2. Дизайн-система (из макетов)

Токены вынесены в `globals.css` (`@theme`): цвета, шрифт Manrope, радиусы — из переменных Figma (§10.4).

- **Button** — 5 ролей × состояния (Default / Hover-Pressed `+1` / Active `+2` / Disable = 30–50% opacity), две цветовые схемы:
  - тёмная (Primary чёрный, Secondary серый, Tertiary с обводкой, Quaternary белый, Quinary — белый с серым hover);
  - синяя (Primary `Сохранить`, Secondary `Опубликовать`, Tertiary с синей обводкой).
    Отступы: только текст `10–12`, иконка слева/справа — как в блоке «Отступы у кнопок». Реализация — `cva` variants `variant` × `tone`.
- **Badge** — синий и тёмный, pill (`6 ячеек`, счётчик шаблона).
- **Search input** — серый (filled) и белый (outline) × состояния default / focus / filled (иконка поиска слева, `×` справа).
- **Selection toolbar** — тёмная панель: `Выделено: [N ячеек] · M сотрудника(-ов) · K дн.` + действия `Применить шаблон`, `Изменить`, `Очистить`, `Снять`.
- **Employee cell** — аватар (фото или fallback-инициалы на градиенте, «МЕ») + ФИО + «роль · N ч».
- **Shift cell** — 4 цветовые схемы по шаблону/своей смене: индиго (Утро), бирюзовый (Вечер), фиолетовый (День), насыщенный синий (своя). Вид «Неделя»: `08 - 18` + `10 ч`; вид «Месяц»: только `10 ч`.
- **Cell states** — пустая (dashed border), выделенная (синий фон + `+`), с событием, выходной/disabled (серый фон).
- **Template card** — цветная полоса слева, название, `07:00 - 15:00 · 8 ч`, бейдж-счётчик использований.
- **Coverage row** — красный фон/`0` если смен нет, голубой/число если есть.

## 3. Структура проекта (FSD-lite поверх существующего `src/shared`)

```
prisma/
  schema.prisma
  migrations/
  seed.ts
  data/dev.db            # SQLite-файл (в .gitignore)
prisma.config.ts
src/
  app/
    layout.tsx                  # Providers: QueryClientProvider, Toaster
    schedules/[id]/page.tsx     # Server Component: prefetch + HydrationBoundary
    api/
      employees/route.ts        # GET
      templates/route.ts        # GET
      schedules/[id]/shifts/route.ts   # GET ?from&to, PUT {upserts[], deletes[]} (транзакция)
      schedules/[id]/publish/route.ts  # POST
  shared/
    api/        # http-клиент, queryClient, типизированные ошибки
    components/ui/   # shadcn + дизайн-система (button, badge, search-input, ...)
    lib/        # utils (cn), date.ts, time.ts (duration), id.ts
  entities/
    employee/   # types, api, queries, <EmployeeCell/>
    shift-template/  # types, api, queries, <TemplateCard/>
    shift/      # types, zod-схемы, api, queries, mutations, <ShiftChip/>, расчёты
  features/
    schedule-grid/        # сетка, заголовок дней, строка покрытия, виртуализация
    schedule-toolbar/     # поиск, Месяц/Неделя, навигация по датам
    cell-selection/       # выделение (click, shift-click, drag-box), toolbar
    quick-assign/         # меню по клику на цифру даты
    custom-shift/         # блок «Своя смена»
    shift-dnd/            # DnD шаблона/смены на ячейки
    schedule-actions/     # Сохранить / Опубликовать
  widgets/
    schedule-page/        # сборка страницы
  server/
    db.ts                 # PrismaClient singleton, server-only (адаптер выбирает create-client.ts по DATABASE_URL)
    repositories/         # shifts, employees, templates, schedules — вся работа с Prisma
  generated/prisma/       # сгенерированный клиент (в .gitignore)
```

Правило: `features` не импортируют друг друга; общаются через `entities` и zustand-стор.

## 4. Модель данных

Prisma-схема (в SQLite не используем enum и Date-типы → `String`, значения валидируем `zod`; дата как `'YYYY-MM-DD'` — без проблем с часовыми поясами):

```prisma
model Employee      { id String @id @default(cuid()); fullName String; role String @default("agent"); monthlyHours Int @default(24); avatarUrl String?; shifts Shift[] }
model ShiftTemplate { id String @id @default(cuid()); name String; start String; end String; color String; sort Int; shifts Shift[] }
model Schedule      { id String @id @default(cuid()); status String @default("draft"); publishedAt DateTime?; updatedAt DateTime @updatedAt; shifts Shift[] }
model Shift {
  id         String  @id @default(cuid())
  scheduleId String
  employeeId String
  date       String  // 'YYYY-MM-DD'
  start      String  // 'HH:mm'
  end        String
  templateId String? // null = своя смена
  schedule   Schedule @relation(fields: [scheduleId], references: [id], onDelete: Cascade)
  employee   Employee @relation(fields: [employeeId], references: [id], onDelete: Cascade)
  template   ShiftTemplate? @relation(fields: [templateId], references: [id], onDelete: SetNull)
  @@unique([scheduleId, employeeId, date])   // одна смена на ячейку
  @@index([scheduleId, date])
}
```

Доменные типы на фронте:

```ts
Employee      { id, fullName, role: 'agent', monthlyHours: 24, avatarUrl? }
ShiftTemplate { id, name: 'Утро'|'День'|'Вечер', start: 'HH:mm', end: 'HH:mm', color: 'indigo'|'violet'|'teal' }
Shift         { id, employeeId, date: 'YYYY-MM-DD', start, end, templateId: string | null /* null = своя */ }
Schedule      { id, status: 'draft'|'published', updatedAt }
```

- Ключ ячейки `${employeeId}:${date}`; одна смена на ячейку — гарантируется `@@unique`, assign = `upsert` (bulk — в `$transaction`).
- `duration(start,end)` считаем из времени, учитываем переход через полночь (`end <= start` → +24ч). Цвет смены определяется `templateId` (своя → насыщенный синий).
- **Покрытие** — производная: `coverage[date] = количество смен на дату`. Не хранится, считается селектором из кэша Query → обновляется мгновенно при любой мутации.
- **Счётчик в шаблоне** — производная: число смен с этим `templateId` в загруженном периоде.

## 5. Управление состоянием

**TanStack Query** (server state):

- `['employees', {search}]`, `['templates']`, `['shifts', scheduleId, {from, to}]` — период = видимый диапазон (неделя/месяц); `placeholderData: keepPreviousData` при навигации.
- **Черновик правок (draft-буфер).** Решение §10.5: назначение/очистка/перенос не пишутся в БД сразу, копятся до «Сохранить». В плане это операции `pendingOps` и селектор `applyOps(serverShifts, ops)`; в коде — map `draft` (ячейка → значение | null), накладывается поверх кэша Query. Покрытие, счётчики и ячейки считаются из результата → UI обновляется мгновенно.
- **«Сохранить»** — мутация `saveShifts` → `PUT /shifts` с diff (`upserts[]`, `deletes[]`), на сервере одна `prisma.$transaction`; `onSuccess` — invalidate `['shifts']` и очистка `pendingOps`; `onError` — буфер сохраняется, toast.
- **«Опубликовать»** — `POST /publish` (status → `published`, `publishedAt`); активна, только если нет `pendingOps`.
- Поиск по ФИО — клиентская фильтрация по закэшированному списку с `useDeferredValue`/debounce (при росте — перенос в `?q=` на сервер).

**Zustand** (UI state), один стор со слайсами:

- `view: 'week'|'month'`, `anchorDate`
- `search`
- `selection: Set<cellKey>` + `anchor` для shift-выделения; actions `toggle/range/clear`
- `customShift: {start, end}`
- `quickMenu: {date, anchorEl} | null`
- `dnd: {activeId, overCell}`
- `pendingOps: Op[]` — несохранённые правки; `dirty = pendingOps.length > 0` (disabled для «Сохранить», предупреждение `beforeunload`)

Принцип: итоговые смены не дублируем в Zustand — это «кэш Query + pendingOps», единый источник для всех способов назначения.

## 6. Функциональность и как реализуем

1. **Календарь.** Строки — сотрудники, колонки — дни. Неделя (пн–вс) и Месяц (все дни месяца, компактные ячейки `8 ч`). Навигация ‹ › + «Сегодня», дата-пикер на `react-day-picker`. Строка «Покрытие» — sticky снизу, первая колонка (Сотрудник) — sticky слева. Виртуализация строк.
2. **Поиск по ФИО** — серый search-input из дизайн-системы, очистка `×`.
3. **Назначение — единая функция** `assign(cells[], payload{start,end,templateId})` → одна мутация; все пути вызывают её:
   - клик по цифре даты → popover со списком шаблонов → назначает **всем сотрудникам** на эту дату; поиск список не сужает (§10.1);
   - клик по ячейке → выделение → шаблон из правой панели / `Применить шаблон` в toolbar;
   - **Своя смена** — выделить ячейки → время в блоке → «Поставить в выделенные» (валидация zod: формат, `start != end`);
   - `Изменить` (появляется, когда в выделении есть смены) — редактирование времени; `Очистить` — удалить смены; `Снять` — сбросить выделение.
4. **Выделение**: клик, ctrl/⌘-клик (toggle), shift-клик (прямоугольник), протяжка мышью; `Esc` — снять. Toolbar «Выделено: N ячеек · M сотрудников · K дн.» считается из `selection`.
5. **Покрытие**: `count > 0` → голубой стиль + число; `0` → красный. Обновляется реактивно.
6. **Drag-and-drop** (§10.2): тянем карточку шаблона на ячейку (назначить) и существующую смену между ячейками (move; `Alt` — копировать). `DragOverlay`, подсветка целевой ячейки, DnD по клавиатуре. Если перетаскиваемая ячейка входит в выделение — переносим/назначаем всё выделение.
7. **Сохранить / Опубликовать** — тосты; Сохранить disabled при `!dirty` / `isPending`, Опубликовать — при `dirty`.

## 7. Этапы

1. **Каркас**: зависимости, `QueryClientProvider`, токены дизайн-системы, layout (сайдбар «CRM», шапка страницы).
2. **Дизайн-система**: Button, Badge, SearchInput, ToggleGroup (Месяц/Неделя), ShiftChip, TemplateCard, EmployeeCell, SelectionToolbar — страница-«витрина» `/ui` для сверки с Figma.
3. **БД и backend**: Prisma 7 + SQLite (schema, первая миграция, `prisma.config.ts`, adapter, singleton), seed (8 сотрудников, 3 шаблона, расписание с парой смен), репозитории, Zod-схемы, Route Handlers, клиент `shared/api`.
4. **Чтение**: сетка неделя/месяц, навигация, поиск, покрытие, виртуализация.
5. **Выделение** и selection-toolbar.
6. **Назначение**: шаблоны → своя смена → быстрое меню по дате → изменить/очистить, оптимистичные мутации.
7. **DnD**.
8. **Сохранить/Опубликовать**, состояния loading/empty/error, тосты.
9. **Полировка**: a11y (роли `grid`/`gridcell`, фокус, клавиатура), responsive-минимум, `pnpm lint:check && pnpm format:check && pnpm build`.

## 8. Расхождения в макетах и допущения

- Шаблон «Вечер 15:00–23:00» подписан `9 ч`, в расчёте — 8 ч; в сетке `15 - 18` показано как `10 ч` / `9 ч`. **Считаем длительность из времени**, подписи макета считаем опечатками.
- В заголовках встречаются `чт 02`, `пт 03`, `вс 6` с разной нумерацией — это артефакты макета; используем один формат `дд N`.
- Счётчик на карточке шаблона трактуем как «сколько раз использован в текущем периоде».
- Выходные (сб/вс) визуально не отличаются от будней в макете → не блокируем.
- `Изменить` в toolbar есть только на одном макете — показываем, когда в выделении есть хотя бы одна смена.

## 9. Вне объёма

Авторизация. Изначально вне объёма были и серверная БД, и тесты; позже добавлены Postgres для прода, Vitest и Playwright (см. README).

## 10. Решения

1. **Быстрое назначение по дате — всем сотрудникам.** Поиск и виртуализация список не сужают. В коде пока наоборот: `QuickAssignMenu` получает отфильтрованные id (`docs/ANALYSIS.md`, №3).
2. **DnD между ячейками:** перемещение по умолчанию, копирование с `Alt`.
3. **TanStack Table не нужен.** Сетка на Query + Virtual.
4. **Токены из Figma уже выгружены** — `src/app/globals.css`.
5. **Правки копятся в черновике до «Сохранить».** В БД пишется один diff `{ upserts, deletes }`. «Опубликовать» только без несохранённых правок.
