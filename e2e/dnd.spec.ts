import { cell, coverage, DAY, dragTo, EMP, openSchedule, saveButton, template } from "./support/schedule";
import { expect, test } from "./support/test";

test.describe("drag-and-drop настоящей мышью", () => {
  test("шаблон из панели → пустая ячейка", async ({ page }) => {
    await openSchedule(page);

    await dragTo(page, template(page, "Вечер"), cell(page, EMP.novikov, DAY.mon));

    await expect(cell(page, EMP.novikov, DAY.mon).getByText("15 - 23")).toBeVisible();
    await expect(coverage(page, DAY.mon, 1)).toBeVisible();
  });

  test("шаблон на ячейку внутри выделения → во все выделенные", async ({ page }) => {
    await openSchedule(page);
    await cell(page, EMP.novikov, DAY.mon).click();
    await cell(page, EMP.novikov, DAY.tue).click({ modifiers: ["Control"] });

    await dragTo(page, template(page, "День"), cell(page, EMP.novikov, DAY.mon));

    await expect(cell(page, EMP.novikov, DAY.mon).getByText("10 - 18")).toBeVisible();
    await expect(cell(page, EMP.novikov, DAY.tue).getByText("10 - 18")).toBeVisible();
  });

  test("шаблон на ячейку вне выделения → только в неё", async ({ page }) => {
    await openSchedule(page);
    await cell(page, EMP.novikov, DAY.mon).click();

    await dragTo(page, template(page, "Утро"), cell(page, EMP.erokhina, DAY.wed));

    await expect(cell(page, EMP.erokhina, DAY.wed).getByText("07 - 15")).toBeVisible();
    await expect(cell(page, EMP.novikov, DAY.mon).getByText(/\d - \d/)).toHaveCount(0);
  });

  test("смена переносится в другую ячейку: источник очищается, покрытие не меняется", async ({ page }) => {
    await openSchedule(page);
    await expect(coverage(page, DAY.tue, 3)).toBeVisible();

    await dragTo(page, cell(page, EMP.kuznetsova, DAY.tue), cell(page, EMP.novikov, DAY.tue));

    await expect(cell(page, EMP.novikov, DAY.tue).getByText("10 - 18")).toBeVisible();
    await expect(cell(page, EMP.kuznetsova, DAY.tue).getByText(/\d - \d/)).toHaveCount(0);
    await expect(coverage(page, DAY.tue, 3)).toBeVisible();
  });

  test("с зажатым Alt смена копируется: источник остаётся, покрытие растёт", async ({ page }) => {
    await openSchedule(page);

    await dragTo(page, cell(page, EMP.kuznetsova, DAY.tue), cell(page, EMP.novikov, DAY.tue), { alt: true });

    await expect(cell(page, EMP.novikov, DAY.tue).getByText("10 - 18")).toBeVisible();
    await expect(cell(page, EMP.kuznetsova, DAY.tue).getByText("10 - 18")).toBeVisible();
    await expect(coverage(page, DAY.tue, 4)).toBeVisible();
  });

  test("собственная смена переносится вместе со своим временем", async ({ page }) => {
    await openSchedule(page);

    await dragTo(page, cell(page, EMP.kuznetsova, DAY.thu), cell(page, EMP.novikov, DAY.mon));

    await expect(cell(page, EMP.novikov, DAY.mon).getByText("10 - 23")).toBeVisible();
    await expect(cell(page, EMP.kuznetsova, DAY.thu).getByText(/\d - \d/)).toHaveCount(0);
  });

  test("короткий сдвиг (меньше порога) — это клик, а не перетаскивание", async ({ page }) => {
    await openSchedule(page);
    const source = cell(page, EMP.kuznetsova, DAY.tue);
    const box = await source.boundingBox();
    if (!box) throw new Error("нет ячейки");

    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 3, box.y + box.height / 2 + 2);
    await page.mouse.up();

    await expect(source.getByText("10 - 18")).toBeVisible();
    await expect(coverage(page, DAY.tue, 3)).toBeVisible();
  });

  test("результат перетаскивания сохраняется в БД", async ({ page }) => {
    await openSchedule(page);
    await dragTo(page, cell(page, EMP.kuznetsova, DAY.tue), cell(page, EMP.novikov, DAY.tue));
    await dragTo(page, template(page, "Вечер"), cell(page, EMP.erokhina, DAY.mon));

    await saveButton(page).click();
    await expect(page.getByText("График сохранён")).toBeVisible();

    await page.reload();
    await page.getByRole("grid", { name: "График смен" }).waitFor();
    await expect(cell(page, EMP.novikov, DAY.tue).getByText("10 - 18")).toBeVisible();
    await expect(cell(page, EMP.kuznetsova, DAY.tue).getByText(/\d - \d/)).toHaveCount(0);
    await expect(cell(page, EMP.erokhina, DAY.mon).getByText("15 - 23")).toBeVisible();
  });
});
