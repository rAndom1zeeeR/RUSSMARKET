import type { TemplateColor } from "./types";

/** Цвет смены: цвет шаблона или `custom` для собственной смены. */
export type ShiftTone = TemplateColor | "custom";

interface ToneStyle {
  /** Фон и основной текст чипа смены. */
  chip: string;
  /** Цвет вторичного текста (длительность). */
  accent: string;
  /** Цветная полоса слева на карточке шаблона. */
  stripe: string;
}

export const TONE_STYLES: Record<ShiftTone, ToneStyle> = {
  indigo: {
    chip: "bg-shift-indigo-bg text-foreground",
    accent: "text-shift-indigo-fg",
    stripe: "border-l-shift-indigo-stripe",
  },
  violet: {
    chip: "bg-shift-violet-bg text-foreground",
    accent: "text-shift-violet-fg",
    stripe: "border-l-shift-violet-stripe",
  },
  teal: {
    chip: "bg-shift-teal-bg text-foreground",
    accent: "text-shift-teal-fg",
    stripe: "border-l-shift-teal-stripe",
  },
  custom: {
    chip: "bg-shift-custom-bg text-white",
    accent: "text-white/80",
    stripe: "border-l-brand",
  },
};
