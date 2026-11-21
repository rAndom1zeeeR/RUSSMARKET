import { expect, test } from "./support/test";

/**
 * Дата периода считается в браузере, в часовом поясе пользователя. Сервер отдаёт HTML без даты,
 * поэтому при гидратации расходиться нечему — даже если у сервера и браузера разные «сегодня».
 * Пояса выбраны крайние (UTC+14 и UTC−11): в течение суток хотя бы один из них живёт в другой дате, чем сервер.
 */

/** Понедельник текущей недели в формате YYYY-MM-DD для «сегодня» в заданном часовом поясе. */
function mondayIn(timeZone: string): string {
  const [year, month, day] = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(new Date())
    .split("-")
    .map(Number);
  const today = new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1);
  const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - ((today.getDay() + 6) % 7));
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${monday.getFullYear()}-${pad(monday.getMonth() + 1)}-${pad(monday.getDate())}`;
}

for (const timeZone of ["Pacific/Kiritimati", "Pacific/Pago_Pago"]) {
  test.describe(`часовой пояс браузера ${timeZone}`, () => {
    test.use({ timezoneId: timeZone });

    test("серверный HTML графика не содержит даты периода", async ({ request }) => {
      const html = await (await request.get("/schedules/main")).text();
      expect(html).toContain("Загрузка графика…");
      expect(html).not.toMatch(/января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря/);
      expect(html).not.toContain("Быстро назначить смену на");
    });

    test("страница открывается без ошибок гидратации и показывает неделю по часам браузера", async ({ page }) => {
      const problems: string[] = [];
      page.on("console", message => {
        if (message.type() === "error" && /hydrat|did not match|server rendered/i.test(message.text())) {
          problems.push(message.text());
        }
      });
      page.on("pageerror", error => problems.push(error.message));

      await page.goto("/schedules/main");
      await page.getByRole("grid", { name: "График смен" }).waitFor();

      await expect(page.getByRole("button", { name: `Быстро назначить смену на ${mondayIn(timeZone)}` })).toBeVisible();
      expect(problems).toEqual([]);
    });
  });
}
