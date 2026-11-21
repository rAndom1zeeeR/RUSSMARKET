export type TemplateColor = "indigo" | "violet" | "teal";

export interface ShiftTemplateDTO {
  id: string;
  name: string;
  start: string;
  end: string;
  color: TemplateColor;
}
