"use client";

import { useSyncExternalStore } from "react";

/** Должны совпадать с `--breakpoint-*` в globals.css. */
export type Breakpoint = "sm" | "md" | "lg";

const MD_QUERY = "(min-width: 640px)";
const LG_QUERY = "(min-width: 1200px)";

function subscribe(onChange: () => void) {
  const md = window.matchMedia(MD_QUERY);
  const lg = window.matchMedia(LG_QUERY);
  md.addEventListener("change", onChange);
  lg.addEventListener("change", onChange);
  return () => {
    md.removeEventListener("change", onChange);
    lg.removeEventListener("change", onChange);
  };
}

function getSnapshot(): Breakpoint {
  if (window.matchMedia(LG_QUERY).matches) return "lg";
  return window.matchMedia(MD_QUERY).matches ? "md" : "sm";
}

/** Текущий брейкпоинт для размеров, которые нужны в JS (виртуализация строк сетки). */
export function useBreakpoint(): Breakpoint {
  return useSyncExternalStore(subscribe, getSnapshot, () => "lg");
}
