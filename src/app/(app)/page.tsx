import type { Metadata } from "next";
import { ProjectOverview } from "@/widgets/project-overview/ui/project-overview";

export const metadata: Metadata = {
  title: "CRM — О проекте",
  description: "Что сделано в тестовом задании «График смен»: требования ТЗ, дополнения, технологии, ограничения",
};

export default function HomePage() {
  return <ProjectOverview />;
}
