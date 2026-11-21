import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EXTRAS, LIMITATIONS, REQUIREMENT_GROUPS, TECH_GROUPS } from "../model/content";
import { ProjectOverview } from "./project-overview";

const all = REQUIREMENT_GROUPS.flatMap(group => group.items);
const done = all.filter(item => item.status === "done").length;
const partial = all.filter(item => item.status === "partial").length;

describe("ProjectOverview", () => {
  it("заголовок и две кнопки в hero", () => {
    render(<ProjectOverview />);
    expect(screen.getByRole("heading", { level: 1, name: "График смен" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Открыть график/ })).toHaveAttribute("href", "/schedules");
    expect(screen.getByRole("link", { name: "Соответствие ТЗ" })).toHaveAttribute("href", "#requirements");
  });

  it("все разделы на месте", () => {
    render(<ProjectOverview />);
    for (const name of [
      "Требования ТЗ",
      "Добавлено сверх ТЗ",
      "Технологии",
      "Как это устроено",
      /База данных/,
      "Ограничения",
    ]) {
      expect(screen.getByRole("heading", { level: 2, name })).toBeInTheDocument();
    }
  });

  it("у ссылки-якоря есть цель", () => {
    const { container } = render(<ProjectOverview />);
    expect(container.querySelector("#requirements")).not.toBeNull();
  });
});

describe("ProjectOverview: сводка", () => {
  it("считает пункты по данным, а не по заготовленным числам", () => {
    render(<ProjectOverview />);
    const summary = screen.getByLabelText("Сводка");
    expect(within(summary).getByText(`${done} из ${all.length}`)).toBeInTheDocument();
    expect(within(summary).getByText(String(partial))).toBeInTheDocument();
    expect(within(summary).getByText(String(EXTRAS.length))).toBeInTheDocument();
  });

  it("процент: полностью = 1, с оговоркой = ½", () => {
    render(<ProjectOverview />);
    const expected = Math.round(((done + partial / 2) / all.length) * 100);
    expect(within(screen.getByLabelText("Сводка")).getByText(`${expected}%`)).toBeInTheDocument();
  });
});

describe("ProjectOverview: содержимое", () => {
  it("выводит все группы требований и каждый пункт со статусом", () => {
    render(<ProjectOverview />);
    for (const group of REQUIREMENT_GROUPS) {
      expect(screen.getByRole("heading", { level: 3, name: group.title })).toBeInTheDocument();
    }
    expect(screen.getAllByRole("img", { name: "Выполнено" })).toHaveLength(done + 5);
    expect(screen.getAllByRole("img", { name: "Частично" })).toHaveLength(partial);
  });

  it("выводит примечания к пунктам", () => {
    render(<ProjectOverview />);
    for (const item of all.filter(requirement => requirement.note && !requirement.note.includes("`"))) {
      expect(screen.getByText(item.note ?? "")).toBeInTheDocument();
    }
  });

  it("перечисляет дополнения и технологии с версиями", () => {
    render(<ProjectOverview />);
    for (const extra of EXTRAS) expect(screen.getByRole("heading", { name: extra.title })).toBeInTheDocument();
    for (const group of TECH_GROUPS) {
      // «Интерфейс» есть и среди технологий, и среди шагов архитектуры.
      expect(screen.getAllByRole("heading", { level: 3, name: group.title }).length).toBeGreaterThan(0);
    }
    expect(screen.getByText("Next.js")).toBeInTheDocument();
  });

  it("ограничения выводятся списком", () => {
    render(<ProjectOverview />);
    const section = screen.getByRole("heading", { name: "Ограничения" }).closest("section");
    expect(section).not.toBeNull();
    expect(within(section as HTMLElement).getAllByRole("listitem")).toHaveLength(LIMITATIONS.length);
  });
});

describe("ProjectOverview: раздел про базу данных", () => {
  it("объясняет выбор SQLite и готовность к Postgres", () => {
    render(<ProjectOverview />);
    expect(screen.getByRole("heading", { name: "Почему локальная SQLite" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Почему всё готово к Postgres" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Как мигрировать" })).toBeInTheDocument();
  });

  it("шаги миграции — нумерованный список из четырёх шагов", () => {
    render(<ProjectOverview />);
    const heading = screen.getByRole("heading", { name: "Как мигрировать" });
    const steps = within(heading.closest("article") as HTMLElement).getAllByRole("listitem");
    expect(steps).toHaveLength(4);
  });

  it("предупреждает, что миграция не проверялась", () => {
    render(<ProjectOverview />);
    expect(screen.getByText(/не запускалась/)).toBeInTheDocument();
  });
});

describe("ProjectOverview: код в обратных апострофах", () => {
  it("выводится как <code>, сами апострофы не видны", () => {
    const { container } = render(<ProjectOverview />);
    expect(container.querySelectorAll("code").length).toBeGreaterThan(5);
    expect(container.textContent).not.toContain("`");
  });

  it("команда из текста — отдельный code-элемент", () => {
    const { container } = render(<ProjectOverview />);
    const codes = [...container.querySelectorAll("code")].map(element => element.textContent);
    expect(codes).toContain("pnpm db:setup");
    expect(codes).toContain("DATABASE_URL");
  });
});
