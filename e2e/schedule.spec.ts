import { cell, coverage, dateOf, DAY, EMP, openSchedule, panel, saveButton, template } from "./support/schedule";
import { expect, test } from "./support/test";

test.describe("график: просмотр", () => {
  test("открывается с данными сидера: сотрудники, смены, покрытие", async ({ page }) => {
    await openSchedule(page);

    await expect(page.getByText("Кузнецова Алина")).toBeVisible();
    await expect(page.getByText("Волков Тимур")).toBeVisible();
    await expect(cell(page, EMP.kuznetsova, DAY.tue).getByText("10 - 18")).toBeVisible();
    await expect(cell(page, EMP.kuznetsova, DAY.thu).getByText("10 - 23")).toBeVisible();

    await expect(coverage(page, DAY.mon, 0)).toBeVisible();
    await expect(coverage(page, DAY.tue, 3)).toBeVisible();
    await expect(coverage(page, DAY.thu, 4)).toBeVisible();
  });

  test("счётчики на карточках шаблонов считаются по сменам периода", async ({ page }) => {
    await openSchedule(page);
    // Сидер: «День» — 8 смен (Кузнецова ×2, Волков ×2, Морозова, Соколов, Лебедева ×2), «Утро» — 1, «Вечер» — 1.
    await expect(template(page, "День").getByLabel("Использований: 8")).toBeVisible();
    await expect(template(page, "Утро").getByLabel("Использований: 1")).toBeVisible();
    await expect(template(page, "Вечер").getByLabel("Использований: 1")).toBeVisible();
  });
});

test.describe("график: назначение, сохранение, публикация", () => {
  test("шаблон в выделенную ячейку → покрытие → сохранить → данные переживают перезагрузку", async ({ page }) => {
    await openSchedule(page);
    await expect(saveButton(page)).toBeDisabled();

    await cell(page, EMP.novikov, DAY.mon).click();
    await expect(page.getByRole("toolbar")).toContainText("1 ячейка");

    await template(page, "Утро").click();
    await expect(cell(page, EMP.novikov, DAY.mon).getByText("07 - 15")).toBeVisible();
    await expect(coverage(page, DAY.mon, 1)).toBeVisible();
    await expect(saveButton(page)).toBeEnabled();

    await saveButton(page).click();
    await expect(page.getByText("График сохранён")).toBeVisible();
    await expect(saveButton(page)).toBeDisabled();

    await page.reload();
    await page.getByRole("grid", { name: "График смен" }).waitFor();
    await expect(cell(page, EMP.novikov, DAY.mon).getByText("07 - 15")).toBeVisible();
    await expect(coverage(page, DAY.mon, 1)).toBeVisible();
  });

  test("несохранённые правки не попадают в БД: после перезагрузки их нет", async ({ page }) => {
    await openSchedule(page);
    await cell(page, EMP.novikov, DAY.mon).click();
    await template(page, "Вечер").click();
    await expect(cell(page, EMP.novikov, DAY.mon).getByText("15 - 23")).toBeVisible();

    await page.reload();
    await page.getByRole("grid", { name: "График смен" }).waitFor();
    await expect(cell(page, EMP.novikov, DAY.mon).getByText("15 - 23")).toHaveCount(0);
  });

  test("публикация: кнопка меняется, статус переживает перезагрузку, правка возвращает черновик", async ({ page }) => {
    await openSchedule(page);

    await page.getByRole("button", { name: "Опубликовать" }).click();
    await expect(page.getByText("График опубликован")).toBeVisible();
    await expect(page.getByRole("button", { name: "Опубликовано" })).toBeDisabled();

    await page.reload();
    await expect(page.getByRole("button", { name: "Опубликовано" })).toBeDisabled();

    await cell(page, EMP.novikov, DAY.mon).click();
    await template(page, "Утро").click();
    // Пока есть несохранённые правки, публиковать нельзя.
    await expect(page.getByRole("button", { name: "Опубликовано" })).toBeDisabled();
    await saveButton(page).click();
    await expect(page.getByText("График сохранён")).toBeVisible();
    await expect(page.getByRole("button", { name: "Опубликовать" })).toBeEnabled();
  });

  test("повторный клик по выделенной ячейке снимает выделение", async ({ page }) => {
    await openSchedule(page);
    await cell(page, EMP.novikov, DAY.mon).click();
    await expect(page.getByRole("toolbar")).toBeVisible();
    await cell(page, EMP.novikov, DAY.mon).click();
    await expect(page.getByRole("toolbar")).toHaveCount(0);
  });
});

test.describe("график: своя смена", () => {
  test("время из панели ставится во все выделенные ячейки и сохраняется", async ({ page }) => {
    await openSchedule(page);

    await cell(page, EMP.novikov, DAY.mon).click();
    await cell(page, EMP.novikov, DAY.tue).click({ modifiers: ["Control"] });
    await expect(page.getByRole("toolbar")).toContainText("2 ячейки");

    await panel(page).getByLabel("Начало").fill("08:30");
    await panel(page).getByLabel("Конец").fill("13:00");
    await page.getByRole("button", { name: "Поставить в выделенные" }).click();

    await expect(cell(page, EMP.novikov, DAY.mon).getByText("08:30 - 13")).toBeVisible();
    await expect(cell(page, EMP.novikov, DAY.tue).getByText("08:30 - 13")).toBeVisible();

    await saveButton(page).click();
    await expect(page.getByText("График сохранён")).toBeVisible();
    await page.reload();
    await page.getByRole("grid", { name: "График смен" }).waitFor();
    await expect(cell(page, EMP.novikov, DAY.tue).getByText("08:30 - 13")).toBeVisible();
  });

  test("одинаковые начало и конец: ошибка и заблокированная кнопка", async ({ page }) => {
    await openSchedule(page);
    await panel(page).getByLabel("Конец").fill("09:00");
    await expect(panel(page).getByText("Начало и конец не должны совпадать")).toBeVisible();
    await expect(page.getByRole("button", { name: "Поставить в выделенные" })).toBeDisabled();
  });

  test("без выделения подсказывает выделить ячейки", async ({ page }) => {
    await openSchedule(page);
    await page.getByRole("button", { name: "Поставить в выделенные" }).click();
    await expect(page.getByText("Сначала выделите ячейки в календаре")).toBeVisible();
  });
});

test.describe("график: быстрое назначение по дате", () => {
  test("шаблон из меню даты ставится всем сотрудникам", async ({ page }) => {
    await openSchedule(page);

    await page.getByRole("button", { name: `Быстро назначить смену на ${dateOf(DAY.mon)}` }).click();
    await page.getByRole("dialog").getByRole("button", { name: /Вечер/ }).click();

    await expect(coverage(page, DAY.mon, 8)).toBeVisible();
    await expect(cell(page, EMP.novikov, DAY.mon).getByText("15 - 23")).toBeVisible();
    await expect(cell(page, EMP.kuznetsova, DAY.mon).getByText("15 - 23")).toBeVisible();
  });

  test("«Очистить день» убирает все смены дня", async ({ page }) => {
    await openSchedule(page);
    await expect(coverage(page, DAY.thu, 4)).toBeVisible();

    await page.getByRole("button", { name: `Быстро назначить смену на ${dateOf(DAY.thu)}` }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Очистить день" }).click();

    await expect(coverage(page, DAY.thu, 0)).toBeVisible();
    await expect(cell(page, EMP.kuznetsova, DAY.thu).getByText(/\d - \d/)).toHaveCount(0);
  });
});

test.describe("график: правка существующих смен", () => {
  test("изменить время выделенной смены, затем очистить; сохранение переживает перезагрузку", async ({ page }) => {
    await openSchedule(page);

    await cell(page, EMP.kuznetsova, DAY.tue).click();
    await page.getByRole("button", { name: "Изменить время" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Начало").fill("11:00");
    await dialog.getByLabel("Конец").fill("19:00");
    await dialog.getByRole("button", { name: "Применить к выделенным сменам" }).click();
    await expect(cell(page, EMP.kuznetsova, DAY.tue).getByText("11 - 19")).toBeVisible();

    // Обычный клик заменяет выделение: очищаем только смену Волкова, правка Кузнецовой остаётся.
    await cell(page, EMP.volkov, DAY.tue).click();
    await page.getByRole("button", { name: "Очистить" }).click();
    await expect(cell(page, EMP.volkov, DAY.tue).getByText(/\d - \d/)).toHaveCount(0);
    await expect(coverage(page, DAY.tue, 2)).toBeVisible();

    await saveButton(page).click();
    await expect(page.getByText("График сохранён")).toBeVisible();
    await page.reload();
    await page.getByRole("grid", { name: "График смен" }).waitFor();
    await expect(cell(page, EMP.kuznetsova, DAY.tue).getByText("11 - 19")).toBeVisible();
    await expect(cell(page, EMP.volkov, DAY.tue).getByText(/\d - \d/)).toHaveCount(0);
  });

  test("протяжка мышью выделяет прямоугольник из пустых ячеек", async ({ page }) => {
    await openSchedule(page);
    const from = cell(page, EMP.novikov, DAY.mon);
    const to = cell(page, EMP.erokhina, DAY.wed);
    const start = await from.boundingBox();
    const end = await to.boundingBox();
    if (!start || !end) throw new Error("нет ячеек");

    await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2);
    await page.mouse.down();
    await page.mouse.move(end.x + end.width / 2, end.y + end.height / 2, { steps: 12 });
    await page.mouse.up();

    await expect(page.getByRole("toolbar")).toContainText("6 ячеек");
    await expect(page.getByRole("toolbar")).toContainText("2 сотрудника(-ов) · 3 дн.");
  });

  test("Esc снимает выделение", async ({ page }) => {
    await openSchedule(page);
    await cell(page, EMP.novikov, DAY.mon).click();
    await expect(page.getByRole("toolbar")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("toolbar")).toHaveCount(0);
  });
});
