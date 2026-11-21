import { test as base } from "@playwright/test";
import { reseed } from "./db";

/** `test` с автоматическим сбросом данных перед каждым тестом. */
export const test = base.extend<{ freshData: undefined }>({
  freshData: [
    // Playwright требует деструктуризацию первым аргументом, даже пустую.
    // eslint-disable-next-line no-empty-pattern
    async ({}, use) => {
      reseed();
      await use(undefined);
    },
    { auto: true },
  ],
});

export { expect } from "@playwright/test";
