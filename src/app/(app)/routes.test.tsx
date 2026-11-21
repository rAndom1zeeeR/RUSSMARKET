import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AppLayout from "./layout";
import HomePage, { metadata } from "./page";

vi.mock("next/navigation", () => ({ usePathname: () => "/" }));

describe("/ (главная)", () => {
  it("рендерит обзор проекта", () => {
    render(<HomePage />);
    expect(screen.getByRole("heading", { level: 1, name: "График смен" })).toBeInTheDocument();
  });

  it("задаёт заголовок и описание страницы", () => {
    expect(metadata.title).toBe("CRM — О проекте");
    expect(String(metadata.description)).toContain("График смен");
  });
});

describe("layout группы (app)", () => {
  it("оборачивает страницу в каркас с меню", () => {
    render(
      <AppLayout>
        <p>страница</p>
      </AppLayout>
    );
    expect(screen.getByRole("navigation", { name: "Основное меню" })).toBeInTheDocument();
    expect(within(screen.getByRole("main")).getByText("страница")).toBeInTheDocument();
  });
});
