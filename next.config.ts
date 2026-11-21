import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactCompiler: true,
  serverExternalPackages: ["better-sqlite3"],
  // Прод работает на Postgres: SQLite-драйвер (нативный модуль, десятки МБ) и клиент SQLite в образ не нужны.
  // Локально и в тестах они подключаются из node_modules, а не из standalone-сборки.
  outputFileTracingExcludes: {
    "*": [
      "node_modules/.pnpm/better-sqlite3*/**/*",
      "node_modules/.pnpm/@prisma+adapter-better-sqlite3*/**/*",
      "node_modules/.pnpm/@libsql*/**/*",
      "node_modules/.pnpm/libsql*/**/*",
      "src/generated/prisma/**/*",
    ],
  },
};

export default nextConfig;
