import type { Metadata } from "next";
import { databaseStatus } from "@/server/repositories/health";
import { ProjectOverview } from "@/widgets/project-overview/ui/project-overview";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "CRM — О проекте",
  description: "Что сделано в тестовом задании «График смен»: требования ТЗ, дополнения, технологии, ограничения",
};

export default async function HomePage() {
  const connection = await databaseStatus();
  return <ProjectOverview connection={connection} />;
}
