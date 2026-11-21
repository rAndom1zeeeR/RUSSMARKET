import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppShell } from "./app-shell";

const router = vi.hoisted(() => ({ pathname: "/" }));
vi.mock("next/navigation", () => ({ usePathname: () => router.pathname }));

const rail = () => screen.getByRole("navigation", { name: "Основное меню" });

beforeEach(() => {
  router.pathname = "/";
});

describe("AppShell: содержимое", () => {
  it("рендерит children в main", () => {
    render(
      <AppShell>
        <p>Содержимое страницы</p>
      </AppShell>
    );
    expect(within(screen.getByRole("main")).getByText("Содержимое страницы")).toBeInTheDocument();
  });

  it("в меню два пункта с правильными адресами", () => {
    render(<AppShell>x</AppShell>);
    expect(within(rail()).getByRole("link", { name: "Главная" })).toHaveAttribute("href", "/");
    expect(within(rail()).getByRole("link", { name: "Смены" })).toHaveAttribute("href", "/schedules");
  });
});

describe("AppShell: активный пункт", () => {
  const current = () =>
    within(rail())
      .getAllByRole("link")
      .filter(link => link.getAttribute("aria-current") === "page")
      .map(link => link.getAttribute("title"));

  it("на главной активна «Главная»", () => {
    render(<AppShell>x</AppShell>);
    expect(current()).toEqual(["Главная"]);
  });

  it.each(["/schedules", "/schedules/main"])("на %s активны «Смены»", pathname => {
    router.pathname = pathname;
    render(<AppShell>x</AppShell>);
    expect(current()).toEqual(["Смены"]);
  });

  it("похожий, но чужой адрес не подсвечивает «Смены»", () => {
    router.pathname = "/schedules-archive";
    render(<AppShell>x</AppShell>);
    expect(current()).toEqual([]);
  });
});

describe("AppShell: сворачивание меню", () => {
  it("кнопка сворачивает и разворачивает меню", async () => {
    render(<AppShell>x</AppShell>);
    expect(rail().className).toContain("lg:w-[280px]");

    await userEvent.click(screen.getByRole("button", { name: /Свернуть меню/ }));
    expect(rail().className).toContain("lg:w-[76px]");
    expect(screen.queryByText("Свернуть меню")).not.toBeInTheDocument();

    await userEvent.click(within(rail()).getAllByRole("button").at(-1) as HTMLElement);
    expect(rail().className).toContain("lg:w-[280px]");
    expect(screen.getByText("Свернуть меню")).toBeInTheDocument();
  });

  it("в свёрнутом виде у меню нет колокольчика", async () => {
    render(<AppShell>x</AppShell>);
    expect(within(rail()).getByRole("button", { name: "Уведомления" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Свернуть меню/ }));
    expect(within(rail()).queryByRole("button", { name: "Уведомления" })).not.toBeInTheDocument();
  });
});

describe("AppShell: выдвижное меню (sm)", () => {
  it("открывается по бургеру и показывает пункты меню", async () => {
    render(<AppShell>x</AppShell>);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Открыть меню" }));
    const drawer = await screen.findByRole("dialog");
    expect(within(drawer).getByRole("link", { name: "Главная" })).toHaveAttribute("href", "/");
    expect(within(drawer).getByRole("link", { name: "Смены" })).toHaveAttribute("href", "/schedules");
  });

  it("закрывается при переходе по ссылке: не остаётся поверх новой страницы", async () => {
    render(<AppShell>x</AppShell>);
    await userEvent.click(screen.getByRole("button", { name: "Открыть меню" }));
    const drawer = await screen.findByRole("dialog");
    await userEvent.click(within(drawer).getByRole("link", { name: "Смены" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("закрывается кнопкой и по Esc", async () => {
    render(<AppShell>x</AppShell>);
    await userEvent.click(screen.getByRole("button", { name: "Открыть меню" }));
    await userEvent.click(await screen.findByRole("button", { name: "Закрыть меню" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Открыть меню" }));
    await screen.findByRole("dialog");
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
