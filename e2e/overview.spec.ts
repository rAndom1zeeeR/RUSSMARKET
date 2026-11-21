import { expect, test } from "./support/test";

test.describe("главная", () => {
  test("показывает обзор проекта и сводку", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { level: 1, name: "График смен" })).toBeVisible();
    for (const name of ["Требования ТЗ", "Добавлено сверх ТЗ", "Технологии", "Тесты", "Ограничения"]) {
      await expect(page.getByRole("heading", { level: 2, name })).toBeVisible();
    }
    await expect(page.getByLabel("Сводка")).toContainText("Соответствие ТЗ");
  });

  test("«Открыть график» ведёт на график", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /Открыть график/ }).click();
    await page.waitForURL("**/schedules/main");
    await expect(page.getByRole("grid", { name: "График смен" })).toBeVisible();
  });

  test("меню: «Смены» и «Главная» переключают страницы и подсвечивают активный пункт", async ({ page }) => {
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: "Основное меню" });
    await expect(nav.getByRole("link", { name: "Главная" })).toHaveAttribute("aria-current", "page");

    await nav.getByRole("link", { name: "Смены" }).click();
    await page.waitForURL("**/schedules/main");
    await expect(nav.getByRole("link", { name: "Смены" })).toHaveAttribute("aria-current", "page");

    await nav.getByRole("link", { name: "Главная" }).click();
    await page.waitForURL("**/");
    await expect(page.getByRole("heading", { level: 1, name: "График смен" })).toBeVisible();
  });

  test("ссылка «назад» в графике ведёт на главную", async ({ page }) => {
    await page.goto("/schedules/main");
    await page.getByRole("link", { name: "На главную" }).click();
    await page.waitForURL("**/");
    await expect(page.getByRole("heading", { level: 1, name: "График смен" })).toBeVisible();
  });

  test("боковое меню сворачивается и разворачивается", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Свернуть меню")).toBeVisible();
    await page.getByRole("button", { name: /Свернуть меню/ }).click();
    await expect(page.getByText("Свернуть меню")).toHaveCount(0);
    await page.getByRole("navigation", { name: "Основное меню" }).getByRole("button").last().click();
    await expect(page.getByText("Свернуть меню")).toBeVisible();
  });

  test("неизвестный график — понятная ошибка, а не падение", async ({ page }) => {
    await page.goto("/schedules/нет-такого");
    await expect(page.getByRole("alert")).toBeVisible();
  });
});
