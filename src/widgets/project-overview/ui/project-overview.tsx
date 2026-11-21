import { ArrowRight, Check, Minus } from "lucide-react";
import Link from "next/link";
import { cn } from "@/shared/lib/utils";
import {
  ARCHITECTURE,
  EXTRAS,
  LAYERS_NOTE,
  LIMITATIONS,
  REQUIREMENT_GROUPS,
  TECH_GROUPS,
  type RequirementStatus,
} from "../model/content";

const CARD = "bg-surface rounded-2xl p-5 md:rounded-[20px] md:p-6";

function countByStatus(status: RequirementStatus): number {
  return REQUIREMENT_GROUPS.reduce((sum, group) => sum + group.items.filter(item => item.status === status).length, 0);
}

function SectionTitle({ id, children, hint }: { id: string; children: string; hint?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <h2 id={id} className="text-xl leading-6 font-semibold tracking-[-0.3px]">
        {children}
      </h2>
      {hint && <p className="text-muted-foreground text-sm">{hint}</p>}
    </div>
  );
}

function StatusIcon({ status }: { status: RequirementStatus }) {
  return (
    <span
      aria-label={status === "done" ? "Выполнено" : "Частично"}
      role="img"
      className={cn(
        "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full",
        status === "done" ? "bg-brand text-white" : "bg-shift-violet-bg text-shift-violet-fg"
      )}
    >
      {status === "done" ? <Check className="size-3.5" aria-hidden /> : <Minus className="size-3.5" aria-hidden />}
    </span>
  );
}

function Stat({ value, label, hint }: { value: string; label: string; hint?: string }) {
  return (
    <div className={cn(CARD, "flex flex-col gap-1 p-4 md:p-6")}>
      <span className="text-2xl leading-8 font-medium tracking-[-1px] md:text-3xl md:leading-9">{value}</span>
      <span className="text-base leading-6">{label}</span>
      {hint && <span className="text-muted-foreground text-xs leading-4">{hint}</span>}
    </div>
  );
}

/** Главная: что сделано, какие требования ТЗ закрыты, что добавлено сверх ТЗ, стек и ограничения. */
export function ProjectOverview() {
  const done = countByStatus("done");
  const partial = countByStatus("partial");
  const total = done + partial;
  // Полностью выполненный пункт = 1, выполненный с оговоркой = ½.
  const score = Math.round(((done + partial / 2) / total) * 100);

  return (
    <div className="mx-auto flex w-full max-w-[1360px] flex-col gap-8 lg:gap-10">
      <section className={cn(CARD, "flex flex-col gap-4 md:p-8")}>
        <p className="text-muted-foreground text-sm">Тестовое задание · Fullstack-разработчик</p>
        <h1 className="text-3xl leading-tight font-medium tracking-[-1px] md:text-[40px]">График смен</h1>
        <p className="max-w-3xl text-base leading-6">
          Функциональный интерфейс по макетам Figma: просмотр расписания, назначение и редактирование смен, шаблоны,
          drag-and-drop, представления «Неделя» и «Месяц», сохранение и публикация. Данные живут в SQLite, интерфейс
          общается с сервером через Route Handlers.
        </p>
        <div className="flex flex-col gap-2 md:flex-row">
          <Link
            href="/schedules"
            className="bg-brand hover:bg-brand-hover active:bg-brand-active inline-flex h-12 items-center justify-center gap-2 rounded-xl px-4 text-base font-semibold text-white transition-colors"
          >
            Открыть график <ArrowRight className="size-5" aria-hidden />
          </Link>
          <a
            href="#requirements"
            className="bg-brand-soft text-brand-ink hover:bg-brand-soft-hover active:bg-brand-soft-active inline-flex h-12 items-center justify-center rounded-xl px-4 text-base font-semibold transition-colors"
          >
            Соответствие ТЗ
          </a>
        </div>
      </section>

      <section aria-label="Сводка" className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <Stat value={`${score}%`} label="Соответствие ТЗ" hint="полностью = 1, с оговоркой = ½" />
        <Stat value={`${done} из ${total}`} label="Пунктов выполнено полностью" />
        <Stat value={String(partial)} label="С оговоркой" hint="см. примечания ниже" />
        <Stat value={String(EXTRAS.length)} label="Добавлено сверх ТЗ" />
      </section>

      <section id="requirements" aria-labelledby="requirements-title" className="flex flex-col gap-4">
        <SectionTitle
          id="requirements-title"
          hint="Пункты разобраны по блокам ТЗ. Фиолетовая отметка — выполнено с оговоркой."
        >
          Требования ТЗ
        </SectionTitle>
        <div className="grid gap-2 md:grid-cols-2">
          {REQUIREMENT_GROUPS.map(group => (
            <article key={group.title} className={CARD}>
              <h3 className="mb-3 text-base leading-6 font-semibold">{group.title}</h3>
              <ul className="flex flex-col gap-3">
                {group.items.map(item => (
                  <li key={item.title} className="flex gap-3">
                    <StatusIcon status={item.status} />
                    <div className="min-w-0">
                      <p className="text-base leading-6">{item.title}</p>
                      {item.note && <p className="text-muted-foreground text-sm leading-5">{item.note}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="extras-title" className="flex flex-col gap-4">
        <SectionTitle id="extras-title" hint="Чего в ТЗ не было, но что делает работу с графиком удобнее и надёжнее.">
          Добавлено сверх ТЗ
        </SectionTitle>
        <ul className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
          {EXTRAS.map(extra => (
            <li key={extra.title} className={cn(CARD, "flex flex-col gap-1")}>
              <h3 className="text-base leading-6 font-semibold">{extra.title}</h3>
              <p className="text-muted-foreground text-sm leading-5">{extra.text}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="tech-title" className="flex flex-col gap-4">
        <SectionTitle id="tech-title" hint="Версии — из package.json.">
          Технологии
        </SectionTitle>
        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
          {TECH_GROUPS.map(group => (
            <article key={group.title} className={CARD}>
              <h3 className="mb-3 text-base leading-6 font-semibold">{group.title}</h3>
              <dl className="flex flex-col gap-3">
                {group.items.map(item => (
                  <div key={item.name}>
                    <dt className="flex flex-wrap items-baseline gap-2 text-base leading-6">
                      <span className="font-medium">{item.name}</span>
                      <span className="text-muted-foreground text-xs">{item.version}</span>
                    </dt>
                    <dd className="text-muted-foreground text-sm leading-5">{item.purpose}</dd>
                  </div>
                ))}
              </dl>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="architecture-title" className="flex flex-col gap-4">
        <SectionTitle id="architecture-title" hint={LAYERS_NOTE}>
          Как это устроено
        </SectionTitle>
        <ol className="grid gap-2 md:grid-cols-2 lg:grid-cols-5">
          {ARCHITECTURE.map((step, index) => (
            <li key={step.title} className={cn(CARD, "flex flex-col gap-1")}>
              <span className="bg-brand-soft text-brand-ink flex size-6 items-center justify-center rounded-full text-xs font-semibold">
                {index + 1}
              </span>
              <h3 className="text-base leading-6 font-semibold">{step.title}</h3>
              <p className="text-muted-foreground text-sm leading-5">{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="limits-title" className="flex flex-col gap-4">
        <SectionTitle id="limits-title" hint="Что не проверено или сделано по допущению.">
          Ограничения
        </SectionTitle>
        <ul className={cn(CARD, "flex flex-col gap-2")}>
          {LIMITATIONS.map(item => (
            <li key={item} className="flex gap-3 text-base leading-6">
              <Minus className="text-muted-foreground mt-1 size-4 shrink-0" aria-hidden />
              {item}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
