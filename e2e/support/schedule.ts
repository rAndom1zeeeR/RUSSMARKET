import type { Locator, Page } from "@playwright/test";

/** Сотрудники сидера (`prisma/seed.ts`), нужные тестам. */
export const EMP = {
  kuznetsova: "emp-1", // вт, ср — «День»; чт, пт — своя 10–23
  volkov: "emp-2", // вт, ср — «День»; пт — «Вечер»
  morozova: "emp-3", // чт — «День»
  novikov: "emp-6", // смен нет
  erokhina: "emp-7", // смен нет
} as const;

export const DAY = { mon: 0, tue: 1, wed: 2, thu: 3, fri: 4, sat: 5, sun: 6 } as const;

function iso(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Дата дня текущей недели (сидер раскладывает смены относительно понедельника этой недели). */
export function dateOf(day: number): string {
  const now = new Date();
  const sinceMonday = (now.getDay() + 6) % 7;
  return iso(new Date(now.getFullYear(), now.getMonth(), now.getDate() - sinceMonday + day));
}

export const cell = (page: Page, employeeId: string, day: number): Locator =>
  page.locator(`[data-cell="${employeeId}|${dateOf(day)}"]`);

export const coverage = (page: Page, day: number, count: number): Locator =>
  page.getByLabel(`Покрытие ${dateOf(day)}: ${count}`);

/** Панель шаблонов справа (на узких экранах — под сеткой). */
export const panel = (page: Page): Locator => page.locator("aside");

export const template = (page: Page, name: string): Locator =>
  panel(page).getByRole("button", { name: new RegExp(name) });

export const saveButton = (page: Page): Locator => page.getByRole("button", { name: /Сохран/ });

export async function openSchedule(page: Page): Promise<void> {
  await page.goto("/schedules");
  await page.waitForURL("**/schedules/main");
  await page.getByRole("grid", { name: "График смен" }).waitFor();
}

async function centerOf(locator: Locator): Promise<{ x: number; y: number }> {
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  if (!box) throw new Error("Элемент не отображается, перетаскивание невозможно");
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/**
 * Перетаскивание настоящей мышью. dnd-kit стартует после сдвига на 6 px, поэтому сначала
 * отходим от точки нажатия, затем плавно ведём курсор к цели. `alt` — копирование вместо переноса.
 */
export async function dragTo(
  page: Page,
  source: Locator,
  target: Locator,
  options: { alt?: boolean } = {}
): Promise<void> {
  const from = await centerOf(source);
  await page.mouse.move(from.x, from.y);
  if (options.alt) await page.keyboard.down("Alt");
  await page.mouse.down();
  await page.mouse.move(from.x + 12, from.y + 12, { steps: 4 });
  const to = await centerOf(target);
  await page.mouse.move(to.x, to.y, { steps: 20 });
  await page.mouse.up();
  if (options.alt) await page.keyboard.up("Alt");
  // dnd-kit ещё ~50 мс после сброса глушит первый клик (защита от ложного клика после перетаскивания).
  // Человек так быстро не кликает, а скрипт — да, поэтому даём библиотеке отпустить страницу.
  await page.waitForTimeout(100);
}
