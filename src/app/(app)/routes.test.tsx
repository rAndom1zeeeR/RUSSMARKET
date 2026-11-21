import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AppLayout from "./layout";
import HomePage, { metadata } from "./page";

const mocks = vi.hoisted(() => ({ databaseStatus: vi.fn() }));

vi.mock("next/navigation", () => ({ usePathname: () => "/" }));
vi.mock("@/server/repositories/health", () => ({ databaseStatus: mocks.databaseStatus }));

beforeEach(() => {
  mocks.databaseStatus.mockReset();
  mocks.databaseStatus.mockResolvedValue({ provider: "sqlite", connected: true });
});

describe("/ (главная)", () => {
  it("рендерит обзор проекта и статус базы", async () => {
    mocks.databaseStatus.mockResolvedValue({ provider: "postgres", connected: false });
    render(await HomePage());
    expect(screen.getByRole("heading", { level: 1, name: "График смен" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Postgres · нет связи");
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
