/** Статус пункта ТЗ: `done` — выполнен полностью, `partial` — выполнен с оговоркой. */
export type RequirementStatus = "done" | "partial";

interface Requirement {
  title: string;
  status: RequirementStatus;
  note?: string;
}

export interface RequirementGroup {
  title: string;
  items: readonly Requirement[];
}

export interface Extra {
  title: string;
  text: string;
}

interface TechItem {
  name: string;
  version: string;
  purpose: string;
}

export interface TechGroup {
  title: string;
  items: readonly TechItem[];
}

export interface ArchitectureStep {
  title: string;
  text: string;
}

export const REQUIREMENT_GROUPS: readonly RequirementGroup[] = [
  {
    title: "График смен",
    items: [
      { title: "Календарь со списком сотрудников и назначенными сменами", status: "done" },
      { title: "Поиск по ФИО", status: "done" },
      {
        title: "Навигация по датам",
        status: "done",
        note: "В макете блок дат скрыт — он стоит справа в тулбаре; клик по названию периода возвращает к текущему.",
      },
      { title: "Переключение «Месяц / Неделя»", status: "done" },
    ],
  },
  {
    title: "Назначение смены",
    items: [
      {
        title: "Быстрое назначение: клик по дате открывает меню выбора смены",
        status: "done",
        note: "Смена ставится всем видимым сотрудникам (с учётом поиска) — это моё допущение.",
      },
      { title: "Назначение через ячейку: выбрать ячейку → выбрать шаблон", status: "done" },
      { title: "Смена сразу отображается в календаре", status: "done" },
      { title: "Общие данные для всех способов, редактирование после назначения", status: "done" },
    ],
  },
  {
    title: "Покрытие смен",
    items: [
      { title: "Есть хотя бы одна смена — индикатор голубой, с числом", status: "done" },
      { title: "Смен нет — исходное красное состояние «0»", status: "done" },
      {
        title: "Состояние обновляется без перезагрузки страницы",
        status: "done",
        note: "Считается на клиенте из серверных данных и черновика правок.",
      },
    ],
  },
  {
    title: "Шаблоны и своя смена",
    items: [
      { title: "Шаблоны «Утро», «День», «Вечер» с временем начала и окончания", status: "done" },
      { title: "Шаблоны переиспользуются для разных сотрудников", status: "done" },
      { title: "Выделение одной или нескольких ячеек", status: "done" },
      { title: "Блок «Своя смена»: произвольное начало и конец", status: "done" },
      { title: "Применение к сменам во всех выделенных ячейках", status: "done" },
      { title: "Повторное изменение времени и назначение другим сотрудникам", status: "done" },
    ],
  },
  {
    title: "Остальное из ТЗ",
    items: [
      {
        title: "Drag-and-drop шаблона между ячейками",
        status: "done",
        note: "Шаблон → ячейка (или все выделенные), смена → другая ячейка.",
      },
      { title: "Представление в виде месяца", status: "done" },
      { title: "Сохранение результата", status: "done", note: "В SQLite, одним запросом и одной транзакцией." },
      {
        title: "Взаимодействие frontend и backend",
        status: "done",
        note: "Route Handlers, валидация zod, запросы через TanStack Query.",
      },
    ],
  },
  {
    title: "Соответствие макету Figma",
    items: [
      { title: "Цвета, шрифт Manrope, радиусы, состояния кнопок", status: "done", note: "Взяты из переменных макета." },
      {
        title: "Экран «Неделя»: размеры и отступы",
        status: "done",
        note: "Замерено на ширине 1700 px: карточка 1017×744, панель 335, строка 72, шапка и футер по 48.",
      },
      {
        title: "Экраны «Месяц», «Выделение», «Своя смена»",
        status: "done",
        note: "Сверены с макетом вручную автором проекта.",
      },
      {
        title: "Меню быстрого назначения",
        status: "partial",
        note: "Отдельного кадра в макете нет — собрано из компонентов дизайн-системы.",
      },
      { title: "Фото сотрудников", status: "done", note: "У всех восьми сотрудников есть фото." },
    ],
  },
];

export const EXTRAS: readonly Extra[] = [
  {
    title: "База данных и сидер",
    text: "Prisma 7 + SQLite, миграции и идемпотентный сидер: файл БД не в git, но после `pnpm db:setup` проект сразу с данными.",
  },
  {
    title: "Черновик правок",
    text: "Изменения копятся локально, «Сохранить» отправляет только разницу (upsert + delete) одной транзакцией.",
  },
  {
    title: "Публикация графика",
    text: "Статус и дата публикации в БД; кнопка доступна, только когда нет несохранённых правок.",
  },
  {
    title: "Мультивыделение",
    text: "Протяжка мышью, Ctrl/⌘-клик, Shift-клик, Esc. На тач-экранах тап добавляет ячейку в выделение.",
  },
  {
    title: "Перенос и копирование смен",
    text: "Смену можно перетащить в другую ячейку, с зажатым Alt — скопировать; оверлей под курсором и подсветка цели.",
  },
  {
    title: "Правка выделенных смен",
    text: "Панель выделения: применить шаблон, изменить время сразу у всех выбранных смен, очистить.",
  },
  {
    title: "Быстрое меню",
    text: "Помимо шаблонов и своей смены есть «Очистить день».",
  },
  {
    title: "Счётчик шаблонов",
    text: "На карточке шаблона — сколько раз он использован в текущем периоде.",
  },
  {
    title: "Ночные смены и валидация",
    text: "Если конец раньше начала, смена считается через полночь; время проверяется на клиенте и на сервере (zod).",
  },
  {
    title: "Адаптив 320 / 640 / 1200",
    text: "Выдвижное меню на телефоне, рейка на планшете, компактная сетка; панель выделения плавает внизу экрана.",
  },
  {
    title: "Виртуализация строк",
    text: "Сетка рендерит только видимых сотрудников (TanStack Virtual) — выдержит длинный список.",
  },
  {
    title: "Автотесты",
    text: "Vitest + Testing Library: логика, сервер на временной SQLite с боевыми миграциями, компоненты и страница целиком. Порог покрытия проверяет CI.",
  },
  {
    title: "Уведомления и сворачиваемое меню",
    text: "Тосты об ошибках и успехе, боковое меню сворачивается до иконок.",
  },
  {
    title: "CI",
    text: "GitHub Actions на push и pull request: oxlint, oxfmt --check и knip (`pnpm check`).",
  },
];

export const TECH_GROUPS: readonly TechGroup[] = [
  {
    title: "Платформа",
    items: [
      { name: "Next.js", version: "16.4", purpose: "App Router, Route Handlers, серверные компоненты" },
      { name: "React", version: "19.3", purpose: "UI; включён React Compiler" },
      { name: "TypeScript", version: "7", purpose: "strict, без `any`" },
    ],
  },
  {
    title: "Данные и сервер",
    items: [
      { name: "Prisma", version: "7.10", purpose: "ORM, миграции, сидер" },
      { name: "SQLite", version: "better-sqlite3 12", purpose: "локальная БД — осознанный выбор, см. раздел ниже" },
      { name: "zod", version: "4.6", purpose: "валидация запросов и общих DTO" },
    ],
  },
  {
    title: "Состояние и взаимодействие",
    items: [
      { name: "TanStack Query", version: "5.108", purpose: "серверные данные, мутации, кэш" },
      { name: "Zustand", version: "5", purpose: "UI-состояние и черновик правок" },
      { name: "TanStack Virtual", version: "3.14", purpose: "виртуализация строк сетки" },
      { name: "dnd-kit", version: "core 6.3", purpose: "перетаскивание шаблонов и смен" },
    ],
  },
  {
    title: "Интерфейс",
    items: [
      { name: "Tailwind CSS", version: "4.3", purpose: "токены из Figma, брейкпоинты 320/640/1200" },
      { name: "Radix UI", version: "1.8", purpose: "popover, drawer — доступные примитивы" },
      { name: "cva + tailwind-merge", version: "—", purpose: "варианты компонентов дизайн-системы" },
      { name: "date-fns", version: "4.4", purpose: "даты, русская локаль" },
      { name: "lucide-react, sonner", version: "—", purpose: "иконки и уведомления" },
    ],
  },
  {
    title: "Инструменты",
    items: [
      { name: "oxlint", version: "1.94", purpose: "линт и границы слоёв FSD" },
      { name: "oxfmt", version: "0.79", purpose: "форматирование" },
      { name: "Vitest", version: "5.1", purpose: "тесты и покрытие: unit, сервер на временной SQLite, jsdom" },
      { name: "Testing Library", version: "—", purpose: "тесты компонентов глазами пользователя" },
      { name: "pnpm, tsx, knip", version: "—", purpose: "пакеты, запуск сидера, поиск неиспользуемого кода" },
      { name: "GitHub Actions", version: "—", purpose: "CI: lint, format, knip на push и pull request" },
    ],
  },
];

export const ARCHITECTURE: readonly ArchitectureStep[] = [
  { title: "Интерфейс", text: "Сетка, панели, выделение; черновик правок в Zustand" },
  { title: "TanStack Query", text: "Загрузка периода, мутации сохранения и публикации" },
  { title: "Route Handlers", text: "`/api/*`, валидация zod, общие схемы с клиентом" },
  { title: "Prisma", text: "Репозитории в `src/server`, транзакция на сохранение" },
  { title: "SQLite", text: "Файл `prisma/data/dev.db`, не в git; данные даёт сидер" },
];

export const DATABASE = {
  reasons: [
    "Проверяющему не нужен сервер БД: после `pnpm db:setup` проект сразу работает с данными.",
    "Файл БД лежит в проекте, но не в git; сидер воспроизводит данные одной командой.",
    "Задача — один график одной компании: отдельный сервер БД дал бы сложность без выгоды.",
  ],
  readiness: [
    "Весь доступ к данным идёт через Prisma: сырого SQL и типов, специфичных для SQLite, в коде нет.",
    "БД трогает только `src/server`: репозитории скрывают детали от Route Handlers и интерфейса.",
    "Адрес БД — переменная `DATABASE_URL`; от SQLite зависят лишь провайдер в схеме и адаптер в двух файлах.",
    "Целостность держит схема, а не SQLite: уникальный ключ (график, сотрудник, дата), индексы и каскады переносятся как есть.",
    "Сохранение уже выполняется одной транзакцией — та же модель работает на Postgres.",
  ],
  steps: [
    'В `prisma/schema.prisma` заменить `provider = "sqlite"` на `"postgresql"`.',
    "Поставить `@prisma/adapter-pg` и `pg`, заменить адаптер в `src/server/db.ts` и `prisma/seed.ts`.",
    'Указать `DATABASE_URL="postgresql://…"`.',
    "Удалить `prisma/migrations` (они на диалекте SQLite), выполнить `prisma migrate dev --name init` и `pnpm db:seed`.",
  ],
  caveat:
    "Миграция описана, но на Postgres не запускалась. Даты и время хранятся строками (`YYYY-MM-DD`, `HH:mm`) ради простоты; в Postgres их можно перевести в `Date` / `Time`.",
} as const;

export const LAYERS_NOTE =
  "Код разложен по слоям shared → entities → features → widgets → app, границы между ними проверяет линтер.";

export const LIMITATIONS: readonly string[] = [
  "Перетаскивание проверено автотестами на уровне наших обработчиков (в том числе Alt-копирование), но не реальной мышью в браузере; долгое нажатие на тач-устройстве не проверялось.",
  "Режим «Месяц» на 320 и 640 px, а также применение шаблонов и «Своей смены» на узких экранах в браузере не проверялись.",
  "Нет авторизации и браузерных E2E-тестов — они не входили в ТЗ; остальное покрыто Vitest.",
  "Быстрое назначение применяется ко всем видимым сотрудникам — допущение, в ТЗ это не уточнено.",
];
