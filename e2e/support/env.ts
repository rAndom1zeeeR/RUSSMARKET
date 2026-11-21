/** Отдельный порт и отдельная БД: E2E не трогает ни dev-сервер, ни `prisma/data/dev.db`. */
export const PORT = 3100;
export const BASE_URL = `http://localhost:${PORT}`;
export const DB_FILE = "prisma/data/e2e.db";
export const DATABASE_URL = `file:./${DB_FILE}`;
