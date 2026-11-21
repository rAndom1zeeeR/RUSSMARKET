export interface ScheduleDTO {
  id: string;
  title: string;
  status: "draft" | "published";
  publishedAt: string | null;
  updatedAt: string;
}
