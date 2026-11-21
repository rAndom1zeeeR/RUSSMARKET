import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": `${root}src`,
      // `server-only` бросает ошибку вне серверной сборки Next — в тестах это заглушка.
      "server-only": `${root}tests/stubs/server-only.ts`,
    },
  },
  test: {
    projects: [
      {
        // Чистая логика: даты, время, склонения, модели, zod-схемы, хранилище, контент главной.
        extends: true,
        test: {
          name: "unit",
          environment: "node",
          include: ["src/**/*.test.ts"],
          exclude: ["**/node_modules/**", "src/server/**", "src/app/api/**"],
        },
      },
      {
        // Сервер на настоящей временной SQLite: миграции из prisma/migrations применяются как в проде.
        extends: true,
        test: {
          name: "server",
          environment: "node",
          include: ["src/server/**/*.test.ts", "src/app/api/**/*.test.ts", "prisma/**/*.test.ts"],
          setupFiles: ["./tests/setup/db.ts"],
        },
      },
      {
        // Компоненты, хуки и страницы.
        extends: true,
        test: {
          name: "dom",
          environment: "jsdom",
          include: ["src/**/*.test.tsx"],
          setupFiles: ["./vitest.setup.ts"],
        },
      },
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/generated/**", "src/**/*.test.{ts,tsx}", "src/app/layout.tsx"],
      // Порог на случай, если кто-то начнёт добавлять код без тестов (сейчас: ~99 / 95 / 100 / 100).
      thresholds: { statements: 95, branches: 90, functions: 95, lines: 95 },
    },
  },
});
