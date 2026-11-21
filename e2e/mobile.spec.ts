import { cell, coverage, DAY, EMP, openSchedule, saveButton } from "./support/schedule";
import { expect, test } from "./support/test";

// Проект «mobile»: 320×640, касания (см. playwright.config.ts).

const noHorizontalScroll = (page: import("@playwright/test").Page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

test.describe("мобильная версия (320 px)", () => {
  test("главная помещается в экран, меню открывается бургером и ведёт на график", async ({ page }) => {
    await page.goto("/");
    expect(await noHorizontalScroll(page)).toBe(true);

    await page.getByRole("button", { name: "Открыть меню" }).tap();
    await page.getByRole("dialog").getByRole("link", { name: "Смены" }).tap();
    await page.waitForURL("**/schedules/main");
    await expect(page.getByRole("grid", { name: "График смен" })).toBeVisible();
    // После перехода выдвижное меню закрывается, а не остаётся поверх новой страницы.
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("график помещается в экран, верхняя панель вместо бокового меню", async ({ page }) => {
    await openSchedule(page);
    expect(await noHorizontalScroll(page)).toBe(true);
    await expect(page.getByRole("button", { name: "Открыть меню" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Основное меню" })).toBeHidden();
  });

  test("тап добавляет ячейки в выделение; шаблон через плавающую панель; сохранение", async ({ page }) => {
    await openSchedule(page);

    await cell(page, EMP.novikov, DAY.mon).tap();
    await cell(page, EMP.novikov, DAY.tue).tap();
    const toolbar = page.getByRole("toolbar");
    await expect(toolbar).toContainText("2 ячейки");

    await toolbar.getByRole("button", { name: "Применить шаблон" }).tap();
    await page.getByRole("dialog").getByRole("button", { name: /Вечер/ }).tap();

    await expect(cell(page, EMP.novikov, DAY.mon).getByText("15 - 23")).toBeVisible();
    await expect(cell(page, EMP.novikov, DAY.tue).getByText("15 - 23")).toBeVisible();
    await expect(coverage(page, DAY.mon, 1)).toBeVisible();

    await saveButton(page).tap();
    await expect(page.getByText("График сохранён")).toBeVisible();
    await page.reload();
    await page.getByRole("grid", { name: "График смен" }).waitFor();
    await expect(cell(page, EMP.novikov, DAY.mon).getByText("15 - 23")).toBeVisible();
  });

  test("повторный тап убирает ячейку из выделения, «Снять» очищает всё", async ({ page }) => {
    await openSchedule(page);
    await cell(page, EMP.novikov, DAY.mon).tap();
    await cell(page, EMP.novikov, DAY.tue).tap();
    await cell(page, EMP.novikov, DAY.mon).tap();
    await expect(page.getByRole("toolbar")).toContainText("1 ячейка");

    await page.getByRole("button", { name: "Снять выделение" }).tap();
    await expect(page.getByRole("toolbar")).toHaveCount(0);
  });

  test("панель шаблонов лежит под сеткой и доступна прокруткой", async ({ page }) => {
    await openSchedule(page);
    const panel = page.locator("aside");
    await panel.scrollIntoViewIfNeeded();
    await expect(panel.getByRole("heading", { name: "Шаблоны смен" })).toBeVisible();
    await expect(panel.getByRole("heading", { name: "Своя смена" })).toBeVisible();
  });

  test("быстрое назначение по дате: меню не шире экрана", async ({ page }) => {
    await openSchedule(page);
    await page
      .getByRole("button", { name: /Быстро назначить смену/ })
      .first()
      .tap();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    const box = await dialog.boundingBox();
    expect(box && box.x >= 0 && box.x + box.width <= 320).toBe(true);
  });
});
