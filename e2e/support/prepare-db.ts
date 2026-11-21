import { prepareDatabase } from "./db";

// Запускается перед стартом сервера (см. webServer.command в playwright.config.ts).
prepareDatabase();
