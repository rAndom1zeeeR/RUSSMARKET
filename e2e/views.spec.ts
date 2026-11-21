import { cell, coverage, dateOf, DAY, EMP, openSchedule } from "./support/schedule";
import { expect, test } from "./support/test";

test.describe("виды и навигация", () => {
  test("«Месяц» показывает все дни месяца и двигается по месяцам", async ({ page }) => {
    await openSchedule(page);
    await page.getByRole("radio", { name: "Месяц" }).click();

    const [year, month] = dateOf(DAY.mon).split("-").map(Number);
    const daysInMonth = new Date(year ?? 2026, month ?? 1, 0).getDate();
    await expect(page.getByRole("columnheader")).toHaveCount(daysInMonth + 1);

    const title = page.getByRole("button", { name: /\d{4}$/ });
    const before = await title.textContent();
    await page.getByRole("button", { name: "Следующий период" }).click();
    await expect(title).not.toHaveText(before ?? "");
    await page.getByRole("button", { name: "Предыдущий период" }).click();
    await expect(title).toHaveText(before ?? "");
  });

  test("в месяце в ячейке только длительность смены", async ({ page }) => {
    await openSchedule(page);
    await page.getByRole("radio", { name: "Месяц" }).click();
    await expect(cell(page, EMP.kuznetsova, DAY.tue).getByText("8 ч")).toBeVisible();
    await expect(cell(page, EMP.kuznetsova, DAY.tue).getByText("10 - 18")).toHaveCount(0);
  });

  test("вернуться на «Неделя» — снова диапазон времени", async ({ page }) => {
    await openSchedule(page);
    await page.getByRole("radio", { name: "Месяц" }).click();
    await page.getByRole("radio", { name: "Неделя" }).click();
    await expect(cell(page, EMP.kuznetsova, DAY.tue).getByText("10 - 18")).toBeVisible();
  });

  test("следующая неделя пуста, клик по названию периода возвращает к текущей", async ({ page }) => {
    await openSchedule(page);
    await page.getByRole("button", { name: "Следующий период" }).click();
    await expect(page.locator("[data-cell]").getByText(/\d - \d/)).toHaveCount(0);

    await page.getByRole("button", { name: /\d{4}$/ }).click();
    await expect(cell(page, EMP.kuznetsova, DAY.tue).getByText("10 - 18")).toBeVisible();
  });

  test("панель выделения подменяет тулбар, «Снять» возвращает его", async ({ page }) => {
    await openSchedule(page);
    await expect(page.getByRole("button", { name: "Следующий период" })).toBeVisible();

    await cell(page, EMP.novikov, DAY.mon).click();
    await expect(page.getByRole("toolbar")).toBeVisible();
    await expect(page.getByRole("button", { name: "Следующий период" })).toBeHidden();

    await page.getByRole("button", { name: "Снять выделение" }).click();
    await expect(page.getByRole("toolbar")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Следующий период" })).toBeVisible();
  });
});

test.describe("поиск по ФИО", () => {
  test("фильтрует сотрудников и возвращает всех после очистки", async ({ page }) => {
    await openSchedule(page);
    const search = page.getByRole("textbox", { name: "Поиск по ФИО" });

    await search.fill("волков");
    await expect(page.getByRole("rowheader")).toHaveCount(1);
    await expect(page.getByText("Волков Тимур")).toBeVisible();
    await expect(page.getByText("Кузнецова Алина")).toHaveCount(0);

    await page.getByRole("button", { name: "Очистить поиск" }).click();
    await expect(page.getByRole("rowheader")).toHaveCount(8);
  });

  test("ничего не найдено — сообщение", async ({ page }) => {
    await openSchedule(page);
    await page.getByRole("textbox", { name: "Поиск по ФИО" }).fill("несуществующий");
    await expect(page.getByText("Сотрудники не найдены")).toBeVisible();
  });

  test("быстрое назначение по дате ставит смену всем, даже когда поиск сузил список (PLAN §10.1)", async ({ page }) => {
    await openSchedule(page);
    await page.getByRole("textbox", { name: "Поиск по ФИО" }).fill("новиков");
    await expect(page.getByRole("rowheader")).toHaveCount(1);

    await page.getByRole("button", { name: `Быстро назначить смену на ${dateOf(DAY.mon)}` }).click();
    await expect(page.getByRole("dialog")).toContainText("8 сотр.");
    await page.getByRole("dialog").getByRole("button", { name: /День/ }).click();

    await expect(coverage(page, DAY.mon, 8)).toBeVisible();
    await page.getByRole("button", { name: "Очистить поиск" }).click();
    await expect(cell(page, EMP.kuznetsova, DAY.mon).getByText("10 - 18")).toBeVisible();
    await expect(cell(page, EMP.novikov, DAY.mon).getByText("10 - 18")).toBeVisible();
  });
});
